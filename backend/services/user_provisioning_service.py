import logging
import os
import re
from urllib.parse import quote_plus, urlparse
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .email_service import EmailSendResult, EmailService, EmailMessagePayload
from .email_templates import WelcomeCredentialsEmailContext, build_welcome_credentials_email


logger = logging.getLogger("mathpulse")


VALID_ROLES = {"student", "teacher", "admin"}
VALID_STATUSES = {"active", "inactive"}
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PASSWORD_UPPER_REGEX = re.compile(r"[A-Z]")
PASSWORD_LOWER_REGEX = re.compile(r"[a-z]")
PASSWORD_DIGIT_REGEX = re.compile(r"\d")
PASSWORD_SPECIAL_REGEX = re.compile(r"[^A-Za-z0-9]")


@dataclass
class AdminCreateUserInput:
    name: str
    email: str
    password: str
    confirm_password: str
    role: str
    status: str
    grade: str
    section: str
    lrn: Optional[str] = None


@dataclass
class CreateUserAndNotifyResult:
    uid: str
    user_created: bool
    email_sent: bool
    result_code: str
    message: str
    warnings: List[str] = field(default_factory=list)
    email_result: Optional[EmailSendResult] = None


class UserProvisioningError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class UserProvisioningService:
    def __init__(
        self,
        *,
        firebase_auth_module: Any,
        firestore_module: Any,
        firestore_server_timestamp: Any,
        email_service: EmailService,
    ) -> None:
        self._firebase_auth_module = firebase_auth_module
        self._firestore_module = firestore_module
        self._firestore_server_timestamp = firestore_server_timestamp
        self._email_service = email_service

    def _ensure_dependencies(self) -> None:
        if self._firebase_auth_module is None:
            raise UserProvisioningError("auth_unavailable", "Firebase Auth service is unavailable.", 503)
        if self._firestore_module is None:
            raise UserProvisioningError("firestore_unavailable", "Firestore service is unavailable.", 503)

    def _normalize_role(self, role: str) -> str:
        normalized = (role or "").strip().lower()
        if normalized not in VALID_ROLES:
            raise UserProvisioningError("invalid_role", "Role must be Student, Teacher, or Admin.", 400)
        return normalized

    def _normalize_status(self, status: str) -> str:
        normalized = (status or "").strip().lower()
        if normalized not in VALID_STATUSES:
            raise UserProvisioningError("invalid_status", "Status must be Active or Inactive.", 400)
        return "Active" if normalized == "active" else "Inactive"

    def _validate_email(self, email: str) -> str:
        normalized = (email or "").strip().lower()
        if not normalized or not EMAIL_REGEX.match(normalized):
            raise UserProvisioningError("invalid_email", "Invalid email format.", 400)
        return normalized

    def _validate_password(self, password: str, confirm_password: str) -> str:
        value = password or ""
        if len(value) < 8:
            raise UserProvisioningError("weak_password", "Password must be at least 8 characters.", 400)
        if not PASSWORD_UPPER_REGEX.search(value):
            raise UserProvisioningError("weak_password", "Password must include at least one uppercase letter.", 400)
        if not PASSWORD_LOWER_REGEX.search(value):
            raise UserProvisioningError("weak_password", "Password must include at least one lowercase letter.", 400)
        if not PASSWORD_DIGIT_REGEX.search(value):
            raise UserProvisioningError("weak_password", "Password must include at least one number.", 400)
        if not PASSWORD_SPECIAL_REGEX.search(value):
            raise UserProvisioningError("weak_password", "Password must include at least one special character.", 400)
        if value != (confirm_password or ""):
            raise UserProvisioningError("password_mismatch", "Password and confirm password do not match.", 400)
        return value

    @staticmethod
    def _auth_user_not_found(error: Exception) -> bool:
        message = str(error).lower()
        return "not found" in message or "no user record" in message

    @staticmethod
    def _slugify(value: str) -> str:
        token = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower())
        return re.sub(r"_+", "_", token).strip("_")

    @staticmethod
    def _build_default_avatar_url(display_name: str) -> str:
        return f"https://ui-avatars.com/api/?name={quote_plus(display_name or 'User')}&background=0d9488&color=fff"

    @staticmethod
    def _derive_brand_avatar_url(login_url: str) -> str:
        configured = (os.getenv("APP_BRAND_AVATAR_URL", "") or "").strip()
        if configured:
            return configured

        parsed = urlparse(login_url or "")
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}/avatar/avatar_icon.png"

        return "https://mathpulse.ai/avatar/avatar_icon.png"

    def _ensure_no_duplicate_email(self, email: str, firestore_client: Any) -> None:
        try:
            self._firebase_auth_module.get_user_by_email(email)
            raise UserProvisioningError("duplicate_email", "A user with this email already exists.", 409)
        except UserProvisioningError:
            raise
        except Exception as auth_lookup_error:
            if not self._auth_user_not_found(auth_lookup_error):
                logger.warning("Auth duplicate lookup failed for %s: %s", email, auth_lookup_error)
                raise UserProvisioningError("auth_lookup_failed", "Unable to verify duplicate email in Auth.", 503)

        try:
            existing_docs = list(
                firestore_client.collection("users").where("email", "==", email).limit(1).stream()
            )
            if existing_docs:
                raise UserProvisioningError("duplicate_email", "A user profile with this email already exists.", 409)
        except UserProvisioningError:
            raise
        except Exception as firestore_lookup_error:
            logger.warning("Firestore duplicate lookup failed for %s: %s", email, firestore_lookup_error)
            raise UserProvisioningError("firestore_lookup_failed", "Unable to verify duplicate email in Firestore.", 503)

    def _build_profile_payload(self, user_input: AdminCreateUserInput, role_lower: str, normalized_status: str) -> Dict[str, Any]:
        display_name = (user_input.name or "").strip()
        grade = (user_input.grade or "").strip() or "Grade 11"
        section = (user_input.section or "").strip() or "Section A"
        class_section_id = self._slugify(f"{grade}_{section}") or "grade_11_section_a"

        payload: Dict[str, Any] = {
            "name": display_name,
            "email": (user_input.email or "").strip().lower(),
            "role": role_lower,
            "status": normalized_status,
            "grade": grade,
            "section": section,
            "classSectionId": class_section_id,
            "forcePasswordChange": True,
            "photo": self._build_default_avatar_url(display_name),
            "updatedAt": self._firestore_server_timestamp,
        }

        if role_lower == "student":
            lrn = (user_input.lrn or "").strip()
            if not lrn:
                raise UserProvisioningError("missing_lrn", "LRN is required for student accounts.", 400)
            payload.update(
                {
                    "lrn": lrn,
                    "level": 1,
                    "currentXP": 0,
                    "totalXP": 0,
                    "streak": 0,
                    "atRiskSubjects": [],
                    "hasTakenDiagnostic": False,
                }
            )
        elif role_lower == "teacher":
            payload.update(
                {
                    "department": f"{grade} - {section}",
                    "teacherId": f"TCH-{self._slugify(payload['email'])}",
                    "subject": "Mathematics",
                    "yearsOfExperience": "0",
                    "qualification": "",
                    "students": [],
                }
            )
        else:
            payload.update(
                {
                    "department": f"{grade} - {section}",
                    "adminId": f"ADM-{self._slugify(payload['email'])}",
                    "position": "Administrator",
                }
            )

        return payload

    def create_user(self, user_input: AdminCreateUserInput) -> str:
        self._ensure_dependencies()

        if not (user_input.name or "").strip():
            raise UserProvisioningError("missing_name", "Name is required.", 400)

        normalized_email = self._validate_email(user_input.email)
        validated_password = self._validate_password(user_input.password, user_input.confirm_password)
        role_lower = self._normalize_role(user_input.role)
        normalized_status = self._normalize_status(user_input.status)

        firestore_client = self._firestore_module.client()
        self._ensure_no_duplicate_email(normalized_email, firestore_client)

        try:
            created_auth_user = self._firebase_auth_module.create_user(
                email=normalized_email,
                password=validated_password,
                display_name=(user_input.name or "").strip(),
                disabled=(normalized_status == "Inactive"),
            )
        except Exception as auth_create_error:
            logger.error("Auth user creation failed for %s: %s", normalized_email, auth_create_error)
            auth_error_text = str(auth_create_error)
            auth_error_text_lower = auth_error_text.lower()

            if "password_does_not_meet_requirements" in auth_error_text_lower or "password requirements" in auth_error_text_lower:
                raise UserProvisioningError(
                    "weak_password",
                    "Password does not meet authentication policy requirements.",
                    400,
                )

            if "email already exists" in auth_error_text_lower or "email_exists" in auth_error_text_lower:
                raise UserProvisioningError("duplicate_email", "A user with this email already exists.", 409)

            raise UserProvisioningError("auth_create_failed", "Failed to create authentication account.", 500)

        uid = str(getattr(created_auth_user, "uid", "") or "").strip()
        if not uid:
            raise UserProvisioningError("missing_uid", "Authentication account created without UID.", 500)

        profile_payload = self._build_profile_payload(user_input, role_lower, normalized_status)
        profile_payload["createdAt"] = self._firestore_server_timestamp

        try:
            firestore_client.collection("users").document(uid).set(profile_payload, merge=True)
        except Exception as firestore_write_error:
            logger.error("Firestore profile write failed for %s: %s", uid, firestore_write_error)
            try:
                self._firebase_auth_module.delete_user(uid)
                logger.info("Rolled back Auth user creation for %s after Firestore write failure.", uid)
            except Exception as rollback_error:
                logger.warning(
                    "Failed to roll back Auth user %s after Firestore write failure: %s",
                    uid,
                    rollback_error,
                )
            raise UserProvisioningError("profile_write_failed", "Failed to create user profile in Firestore.", 500)

        return uid

    def send_welcome_credentials_email(self, user_input: AdminCreateUserInput) -> EmailSendResult:
        display_name = (user_input.name or "").strip()
        login_url = (os.getenv("APP_LOGIN_URL", "") or "").strip() or "https://mathpulse.ai"
        brand_avatar_url = self._derive_brand_avatar_url(login_url)
        recipient_avatar_url = self._build_default_avatar_url(display_name)

        template = build_welcome_credentials_email(
            WelcomeCredentialsEmailContext(
                recipient_name=display_name,
                login_email=(user_input.email or "").strip().lower(),
                temporary_password=user_input.password,
                role=(user_input.role or "").strip().title(),
                login_url=login_url,
                brand_avatar_url=brand_avatar_url,
                recipient_avatar_url=recipient_avatar_url,
            )
        )

        message = EmailMessagePayload(
            to_name=display_name,
            to_email=(user_input.email or "").strip().lower(),
            subject=template["subject"],
            html_content=template["html"],
            text_content=template["text"],
        )
        return self._email_service.send_transactional_email(message)

    def create_user_and_notify(self, user_input: AdminCreateUserInput) -> CreateUserAndNotifyResult:
        uid = self.create_user(user_input)
        warnings: List[str] = []

        email_result = self.send_welcome_credentials_email(user_input)
        if email_result.success:
            return CreateUserAndNotifyResult(
                uid=uid,
                user_created=True,
                email_sent=True,
                result_code="created_and_emailed",
                message="User account was created and welcome email was sent.",
                warnings=warnings,
                email_result=email_result,
            )

        warnings.append("User was created but welcome email delivery failed.")
        if email_result.error_message:
            warnings.append(email_result.error_message)

        return CreateUserAndNotifyResult(
            uid=uid,
            user_created=True,
            email_sent=False,
            result_code="created_email_failed",
            message="User account was created, but welcome email failed to send.",
            warnings=warnings,
            email_result=email_result,
        )

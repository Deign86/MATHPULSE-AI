from services.user_provisioning_service import AdminCreateUserInput, UserProvisioningService
from unittest.mock import MagicMock


def test_teacher_profile_does_not_require_or_assign_a_section():
    provisioning = UserProvisioningService(
        firebase_auth_module=None,
        firestore_module=None,
        firestore_server_timestamp=None,
        email_service=MagicMock(),
    )

    profile = provisioning._build_profile_payload(
        AdminCreateUserInput(
            name="Taylor Teacher",
            email="teacher@example.com",
            password="Secure123!",
            confirm_password="Secure123!",
            role="Teacher",
            status="Active",
            grade="Grade 11",
            section="",
        ),
        "teacher",
        "Active",
    )

    assert profile["role"] == "teacher"
    assert "section" not in profile
    assert "classSectionId" not in profile

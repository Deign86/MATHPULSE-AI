import pytest
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


@pytest.mark.parametrize("role", ["Student", "Teacher", "Admin"])
def test_created_accounts_are_offered_the_first_use_guide(role):
    auth = MagicMock()
    auth.get_user_by_email.side_effect = Exception("No user record found")
    auth.create_user.return_value = MagicMock(uid="new-uid")
    firestore_module = MagicMock()
    users = firestore_module.client.return_value.collection.return_value
    users.where.return_value.limit.return_value.stream.return_value = []
    provisioning = UserProvisioningService(
        firebase_auth_module=auth,
        firestore_module=firestore_module,
        firestore_server_timestamp="server-timestamp",
        email_service=MagicMock(),
    )

    uid = provisioning.create_user(
        AdminCreateUserInput(
            name="New User",
            email="new.user@example.com",
            password="Secure123!",
            confirm_password="Secure123!",
            role=role,
            status="Active",
            grade="Grade 11",
            section="Section A",
            lrn="123456789012",
        )
    )

    assert uid == "new-uid"
    users.document.assert_called_with("new-uid")
    (profile,) = users.document.return_value.set.call_args.args
    assert profile["guideOfferPending"] is True

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.email_templates import (  # noqa: E402
    WelcomeCredentialsEmailContext,
    build_welcome_credentials_email,
)


def test_build_welcome_email_includes_brand_and_recipient_avatar_images() -> None:
    result = build_welcome_credentials_email(
        WelcomeCredentialsEmailContext(
            recipient_name="Ana Cruz",
            login_email="ana@student.com",
            temporary_password="StrongPass1!",
            role="Student",
            login_url="https://mathpulse.ai/login",
            brand_avatar_url="https://cdn.mathpulse.ai/assets/avatar_icon.png",
            recipient_avatar_url="https://ui-avatars.com/api/?name=Ana+Cruz",
        )
    )

    html_content = result["html"]

    assert "MathPulse AI" in html_content
    assert "Learning Platform Account Access" in html_content
    assert "https://cdn.mathpulse.ai/assets/avatar_icon.png" in html_content
    assert "https://ui-avatars.com/api/?name=Ana+Cruz" in html_content
    assert "Temporary Password" in html_content


def test_build_welcome_email_sanitizes_invalid_avatar_urls_and_falls_back() -> None:
    result = build_welcome_credentials_email(
        WelcomeCredentialsEmailContext(
            recipient_name="Ben Dela",
            login_email="ben@student.com",
            temporary_password="StrongPass1!",
            role="Student",
            login_url="javascript:alert(1)",
            brand_avatar_url="ftp://invalid-avatar",
            recipient_avatar_url="data:text/html,unsafe",
        )
    )

    html_content = result["html"]

    assert "javascript:alert(1)" not in html_content
    assert "ftp://invalid-avatar" not in html_content
    assert "data:text/html,unsafe" not in html_content
    assert "https://mathpulse.ai" in html_content
    assert ">MP</div>" in html_content

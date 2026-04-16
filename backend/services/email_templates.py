import html
from dataclasses import dataclass


WELCOME_SUBJECT = "Welcome to MathPulse AI - Your Account Details"
ACCENT_COLOR = "#9956DE"


@dataclass
class WelcomeCredentialsEmailContext:
    recipient_name: str
    login_email: str
    temporary_password: str
    role: str
    login_url: str


def _normalize_display_name(name: str) -> str:
    cleaned = (name or "").strip()
    return cleaned or "Learner"


def build_welcome_credentials_email(context: WelcomeCredentialsEmailContext) -> dict:
    recipient_name = _normalize_display_name(context.recipient_name)
    login_email = (context.login_email or "").strip()
    temporary_password = (context.temporary_password or "").strip()
    role = (context.role or "").strip() or "User"
    login_url = (context.login_url or "").strip() or "https://mathpulse.ai"

    escaped_name = html.escape(recipient_name)
    escaped_email = html.escape(login_email)
    escaped_password = html.escape(temporary_password)
    escaped_role = html.escape(role)
    escaped_url = html.escape(login_url, quote=True)

    html_content = f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{WELCOME_SUBJECT}</title>
</head>
<body style=\"margin:0;padding:0;background:#f6f5fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;\">
  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 12px;\">
    <tr>
      <td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4f4;\">
          <tr>
            <td style=\"background:{ACCENT_COLOR};padding:16px 24px;color:#ffffff;font-size:18px;font-weight:700;\">MathPulse AI</td>
          </tr>
          <tr>
            <td style=\"padding:24px;\">
              <p style=\"margin:0 0 12px 0;font-size:16px;\">Hello {escaped_name},</p>
              <p style=\"margin:0 0 18px 0;line-height:1.6;\">Welcome to MathPulse AI. Your account has been created by your administrator. Use the credentials below to sign in and begin your learning journey.</p>

              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f7f4ff;border:1px solid #e2d8ff;border-radius:12px;padding:16px;\">
                <tr><td style=\"padding:4px 0;font-size:14px;\"><strong>Email:</strong> {escaped_email}</td></tr>
                <tr><td style=\"padding:4px 0;font-size:14px;\"><strong>Temporary Password:</strong> {escaped_password}</td></tr>
                <tr><td style=\"padding:4px 0;font-size:14px;\"><strong>Role:</strong> {escaped_role}</td></tr>
              </table>

              <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:20px 0 14px 0;\">
                <tr>
                  <td align=\"center\" bgcolor=\"{ACCENT_COLOR}\" style=\"border-radius:10px;\">
                    <a href=\"{escaped_url}\" style=\"display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;\">Log in to MathPulse</a>
                  </td>
                </tr>
              </table>

              <p style=\"margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#4b5563;\">Security note: Please change your password after your first login.</p>
              <p style=\"margin:0;font-size:12px;line-height:1.5;color:#6b7280;\">If you did not expect this email, please contact your administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()

    text_content = (
        "MathPulse AI\n\n"
        f"Hello {recipient_name},\n\n"
        "Welcome to MathPulse AI. Your account has been created by your administrator.\n\n"
        "Account details:\n"
        f"- Email: {login_email}\n"
        f"- Temporary Password: {temporary_password}\n"
        f"- Role: {role}\n\n"
        f"Log in here: {login_url}\n\n"
        "Security note: Please change your password after your first login.\n\n"
        "If you did not expect this email, please contact your administrator.\n"
    )

    return {
        "subject": WELCOME_SUBJECT,
        "html": html_content,
        "text": text_content,
    }

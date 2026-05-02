import html
from dataclasses import dataclass
from urllib.parse import urlparse


WELCOME_SUBJECT = "Welcome to MathPulse AI - Your Account Details"
ACCENT_COLOR = "#9956DE"


@dataclass
class WelcomeCredentialsEmailContext:
    recipient_name: str
    login_email: str
    temporary_password: str
    role: str
    login_url: str
    brand_avatar_url: str = ""
    recipient_avatar_url: str = ""


def _normalize_display_name(name: str) -> str:
    cleaned = (name or "").strip()
    return cleaned or "Learner"


def _normalize_http_url(url: str) -> str:
    candidate = (url or "").strip()
    if not candidate:
        return ""

    parsed = urlparse(candidate)
    if parsed.scheme.lower() not in {"http", "https"}:
        return ""
    if not parsed.netloc:
        return ""
    return candidate


def build_welcome_credentials_email(context: WelcomeCredentialsEmailContext) -> dict:
    recipient_name = _normalize_display_name(context.recipient_name)
    login_email = (context.login_email or "").strip()
    temporary_password = (context.temporary_password or "").strip()
    role = (context.role or "").strip() or "User"
    login_url = _normalize_http_url(context.login_url) or "https://mathpulse.ai"
    brand_avatar_url = _normalize_http_url(context.brand_avatar_url)
    recipient_avatar_url = _normalize_http_url(context.recipient_avatar_url)

    escaped_name = html.escape(recipient_name)
    escaped_email = html.escape(login_email)
    escaped_password = html.escape(temporary_password)
    escaped_role = html.escape(role)
    escaped_url = html.escape(login_url, quote=True)
    escaped_brand_avatar_url = html.escape(brand_avatar_url, quote=True)
    escaped_recipient_avatar_url = html.escape(recipient_avatar_url, quote=True)
    recipient_initial = html.escape((recipient_name[:1] or "U").upper())

    if escaped_brand_avatar_url:
        brand_avatar_markup = (
            f'<img src="{escaped_brand_avatar_url}" width="46" height="46" alt="MathPulse avatar" '
            'style="display:block;width:46px;height:46px;border-radius:50%;background:#ffffff;border:2px solid rgba(255,255,255,0.65);" />'
        )
    else:
        brand_avatar_markup = (
            '<div style="width:46px;height:46px;border-radius:50%;background:#1b1331;color:#f5ebff;'
            'font-size:16px;font-weight:800;line-height:46px;text-align:center;border:2px solid rgba(255,255,255,0.4);">MP</div>'
        )

    if escaped_recipient_avatar_url:
        recipient_avatar_markup = (
            f'<img src="{escaped_recipient_avatar_url}" width="54" height="54" alt="Learner avatar" '
            'style="display:block;width:54px;height:54px;border-radius:50%;background:#1f2937;border:1px solid #49537a;" />'
        )
    else:
        recipient_avatar_markup = (
            '<div style="width:54px;height:54px;border-radius:50%;background:#233e74;color:#f8fafc;'
            f'font-size:22px;font-weight:700;line-height:54px;text-align:center;">{recipient_initial}</div>'
        )

    html_content = f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{WELCOME_SUBJECT}</title>
</head>
<body style=\"margin:0;padding:0;background:#0f1220;font-family:Segoe UI,Arial,sans-serif;color:#e5e7eb;\">
  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 12px;background:#0f1220;\">
    <tr>
      <td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#181d2f;border-radius:18px;overflow:hidden;border:1px solid #343e62;\">
          <tr>
            <td style=\"background:{ACCENT_COLOR};padding:14px 22px;\">
              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">
                <tr>
                  <td width=\"52\" valign=\"middle\" style=\"width:52px;\">{brand_avatar_markup}</td>
                  <td valign=\"middle\" style=\"padding-left:10px;\">
                    <p style=\"margin:0;color:#1f1238;font-size:20px;font-weight:800;line-height:1.15;\">MathPulse AI</p>
                    <p style=\"margin:2px 0 0 0;color:#2f1d50;font-size:12px;font-weight:600;line-height:1.4;\">Learning Platform Account Access</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style=\"padding:24px;\">
              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:0 0 14px 0;\">
                <tr>
                  <td width=\"62\" valign=\"top\" style=\"width:62px;padding-right:12px;\">{recipient_avatar_markup}</td>
                  <td valign=\"top\">
                    <p style=\"margin:0 0 8px 0;font-size:16px;color:#f3f4f6;\">Hello {escaped_name},</p>
                    <p style=\"margin:0;line-height:1.6;color:#d6daeb;\">Welcome to MathPulse AI. Your account has been created by your administrator. Use the credentials below to sign in and begin your learning journey.</p>
                  </td>
                </tr>
              </table>

              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#20263b;border:1px solid #445077;border-radius:12px;padding:16px;\">
                <tr><td style=\"padding:4px 0;font-size:14px;color:#e5e7eb;\"><strong>Email:</strong> <span style=\"color:#93c5fd;\">{escaped_email}</span></td></tr>
                <tr><td style=\"padding:4px 0;font-size:14px;color:#e5e7eb;\"><strong>Temporary Password:</strong> {escaped_password}</td></tr>
                <tr><td style=\"padding:4px 0;font-size:14px;color:#e5e7eb;\"><strong>Role:</strong> {escaped_role}</td></tr>
              </table>

              <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:20px 0 14px 0;\">
                <tr>
                  <td align=\"center\" bgcolor=\"{ACCENT_COLOR}\" style=\"border-radius:10px;\">
                    <a href=\"{escaped_url}\" style=\"display:inline-block;padding:12px 20px;color:#1f1238;text-decoration:none;font-weight:700;font-size:14px;\">Log in to MathPulse</a>
                  </td>
                </tr>
              </table>

              <p style=\"margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#c7d2fe;\">Security note: Please change your password after your first login.</p>
              <p style=\"margin:0;font-size:12px;line-height:1.5;color:#a8b3d1;\">If you did not expect this email, please contact your administrator.</p>
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

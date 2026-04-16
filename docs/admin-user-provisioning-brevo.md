# Admin User Provisioning with Brevo Email

This document describes the admin user creation flow that provisions credentials in Firebase Auth, writes a profile in Firestore, and sends a welcome email using Brevo.

## Backend Endpoint

- Route: POST /api/admin/users
- Access: Admin only
- Handler: backend/main.py

### Request Body

```json
{
  "name": "Ana Cruz",
  "email": "ana@student.com",
  "password": "StrongPass1!",
  "confirmPassword": "StrongPass1!",
  "role": "Student",
  "status": "Active",
  "grade": "Grade 11",
  "section": "STEM A",
  "lrn": "123456789012"
}
```

### Response Semantics

- Full success:
  - resultCode: created_and_emailed
  - userCreated: true
  - emailSent: true
- Partial success:
  - resultCode: created_email_failed
  - userCreated: true
  - emailSent: false
  - emailError object is included
- Failure:
  - 4xx/5xx with detail message
  - no user UID returned

## Backend Services

- Profile and account provisioning: backend/services/user_provisioning_service.py
- Email providers and failover: backend/services/email_service.py
- Welcome template: backend/services/email_templates.py

## Email Provider Strategy

1. Primary provider: Brevo Transactional API
2. Optional fallback provider: Brevo SMTP relay
3. If no provider credentials are configured, endpoint can still create users and returns partial success with email_not_configured

## Environment Variables

Configure these on backend runtime environments:

- BREVO_API_KEY
- BREVO_MCP_TOKEN
- BREVO_SMTP_LOGIN
- BREVO_SMTP_KEY
- BREVO_SMTP_HOST (default: smtp-relay.brevo.com)
- BREVO_SMTP_PORT (default: 587)
- MAIL_FROM_ADDRESS
- MAIL_FROM_NAME
- MAIL_SEND_TIMEOUT_SEC (default: 15)
- APP_LOGIN_URL (default: https://mathpulse.ai)

Supported aliases (for compatibility):

- BREVO_API_TOKEN as alias for BREVO_API_KEY
- BREVO_MCP_TOKEN can be used when it contains a base64 JSON payload with `api_key`
- BREVO_SMTP_PASSWORD or BREVO_SMTP_PASS as alias for BREVO_SMTP_KEY
- BREVO_SMTP_USERNAME or BREVO_SMTP_USER as alias for BREVO_SMTP_LOGIN
- MAIL_FROM as alias for MAIL_FROM_ADDRESS

Important runtime note:

- The backend reads process environment variables at runtime.
- If these are missing in the shell/container where the backend process is launched, email sending falls back to not configured.

Local Windows PowerShell example:

```powershell
$env:BREVO_MCP_TOKEN="<your-brevo-mcp-token>"
$env:BREVO_API_KEY="<optional-raw-xkeysib-api-key>"
$env:BREVO_SMTP_HOST="smtp-relay.brevo.com"
$env:BREVO_SMTP_PORT="587"
$env:MAIL_FROM_ADDRESS="<verified-sender@your-domain.com>"
$env:MAIL_FROM_NAME="MathPulse AI"
python main.py
```

Reference samples:

- backend/config/env.sample
- config/env.sample

## Frontend Integration

- API contract and call: src/services/apiService.ts
- Admin service adapter: src/services/adminService.ts
- Admin modal UX + outcomes: src/components/AdminUserManagement.tsx
- Create-form validation helpers: src/utils/adminUserValidation.ts

Behavior in admin modal:

- Create flow validates email, password strength, confirm-password match, role/status, grade, section, and student LRN.
- On full success, UI reports user created and welcome email sent.
- On partial success, UI reports user created but email failed and shows provider error details when available.

## Testing

Added backend tests in backend/tests/test_api.py:

- Full success path with email delivery
- Partial success path when email sending fails

Run:

- python -m pytest backend/tests/test_api.py -k TestAdminCreateUserEndpoint -v

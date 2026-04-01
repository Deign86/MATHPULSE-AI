# Security Policy

## Supported Versions
Security fixes are prioritized for active branches listed below.

| Branch or Line | Supported |
| --- | --- |
| `main` | Yes |
| `release/*` | Yes |
| Other branches | Best effort |

## Reporting a Vulnerability
Please do not open public issues for security vulnerabilities.

Preferred path:
1. Open a private GitHub Security Advisory for this repository.
2. Include reproduction steps, impact, and affected files or endpoints.
3. Include any known mitigation or temporary workaround.

If private advisory tooling is unavailable, contact the repository owner directly and share only minimal necessary details.

## Response Expectations
- Initial acknowledgment target: within 72 hours.
- Triage target: within 7 days.
- Fix timeline: based on severity and exploitability.

## Secret Handling Requirements
- Never commit `.env`, `.env.*`, service account keys, or private key material.
- Use GitHub Actions Secrets for CI.
- Rotate tokens after suspected exposure.
- Remove exposed credentials from all systems and re-issue fresh credentials.

## Hardening Baseline
- Use pull requests for production-bound changes.
- Keep branch protections enabled for production branches.
- Require CI checks before merge.
- Resolve review conversations before merge.

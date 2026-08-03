# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately. Do not open
a public issue for security problems.

- Email the maintainers with a description, reproduction steps, and impact.
- Allow reasonable time for a fix before any public disclosure.

## Scope

- Authentication and session handling (NextAuth, `src/proxy.ts`).
- Authorization and entitlement checks (`src/permissions`).
- Input validation and file uploads (`src/validation`).
- Payment and webhook handling (`src/services/payments`).
- Data persistence (`src/services/database`).

## Handling of secrets

- Secrets are supplied via environment variables (`.env.example` lists them).
- Never commit real secrets. Rotate any credential that is exposed.

See `docs/security.md` for the architectural security notes.

# Y&T Paws Platform — Security

**Version:** 1.2
**Updated:** 2026-08-09
**Status:** V1 application baseline implemented; production infrastructure and independent review remain launch gates.

## 1. Security objectives

Protect customer identity, pet health/care data, booking operations and payment state; prevent cross-user/business access and financial state races; limit damage from credential theft; preserve auditable recovery without retaining unnecessary personal data.

## 2. Trust boundaries

The mobile App and all request bodies are untrusted. Authorization occurs in the backend. Stripe events cross a signature boundary; Expo, Resend, object storage and alert receivers are third-party processors. PostgreSQL and hosting secret storage are privileged infrastructure. A future AI provider is outside V1 and must remain behind an authenticated backend boundary.

## 3. Authentication and sessions

- Passwords are bcrypt hashes and DTOs enforce minimum input requirements.
- JWTs are signed with a production secret of at least 32 characters and have a fixed expiry.
- JWT validation reloads the User and checks `isActive`, `deletedAt`, `tokenVersion` and temporary-password state.
- Password change/reset, staff deactivation and account deletion increment `tokenVersion`, invalidating older JWTs on their next request.
- Staff receive generated temporary passwords and cannot use business APIs until changing them.
- Reset tokens use cryptographic randomness, store only hashes, expire and are single-use.
- Production cannot expose raw reset tokens.

Access JWTs carry an `AuthSession` ID. Random refresh tokens are stored only as hashes, rotate atomically and expire after 30 days. Logout revokes the current session; users can list/revoke individual devices; detected reuse revokes active sessions. Password/security changes still increment `tokenVersion` and remove every session.

## 4. Abuse prevention

Login failure counters lock an account temporarily after repeated failures. Persistent `SecurityEvent` rows enforce login and forgot-password limits using IP and normalized-email hash, while forgot-password responses do not reveal whether an account exists. Events also provide a limited security audit trail and are removed/expired under the documented retention policy.

Production should additionally enforce edge/WAF request limits and bot controls. Application limits are not a substitute for network-layer protection or provider quotas.

## 5. Authorization and tenancy

Controllers require JWT and role guards where appropriate; services enforce ownership, same-business membership and assigned-staff access. Customers access their pets/bookings/payments. Staff see assigned booking care/reports only. Owner/admin manage only their business. The V1 `admin` is business-scoped, not a platform superuser.

Financial actions re-check booking/payment ownership and business scope. Media upload signing is purpose- and role-scoped. UUID validation and DTO whitelist/forbid rules reject malformed IDs and unexpected body fields.

V1 permits only one Business. If onboarding is reopened, every customer discovery query and all tests must be reviewed for explicit tenant selection/isolation first.

## 6. Payment security

Stripe hosts card entry; this backend stores no PAN/CVC. Webhooks verify signatures against the raw body. Amounts derive from immutable booking price snapshots. Conditional writes, serializable booking transactions, partial unique indexes and Stripe idempotency keys protect duplicate payments/refunds. Ambiguous refunds remain pending for webhook/reconciliation rather than guessing.

Stripe live/test separation, dashboard access control, webhook rotation and reconciliation are operational responsibilities. WeChat confirmation is manual and requires owner/admin verification of the actual account.

## 7. Input, browser and network controls

- Global validation strips/forbids unknown fields and transforms DTO values.
- JSON bodies are limited to 1 MB; media uploads bypass the API through bounded presigned URLs.
- Production CORS requires explicit HTTPS origins and rejects wildcard/insecure origins.
- Public, object-storage and alert URLs require HTTPS.
- Trust proxy is fixed to one hop for hosting-proxy client IP handling.

CORS is not authentication, and native mobile requests may have no browser Origin. All endpoints still require normal JWT/ownership controls. Nest applies Helmet headers and a restrictive CSP (with inline allowances required by the small reset page); hosting must still terminate modern TLS, redirect HTTP and add/verify edge headers.

## 8. Media and secrets

Presigned uploads use random keys in a private bucket. New database values are authenticated `/media/files/:encodedKey` locators. The API verifies pet/report/business access and redirects to a 60-second signed GET. Legacy public URLs must be migrated; real-provider private-access verification remains a release gate.

Provider keys and JWT secrets exist only in backend/hosting secret storage. `EXPO_PUBLIC_*` values are public by design and must contain URLs/IDs only. Never commit `.env`, service-account JSON, signing keys or production exports. Rotate any secret suspected of exposure.

## 9. Privacy, deletion and retention

The App and external page provide deletion paths. Deletion disables access immediately, removes/anonymizes contact, pet-care, health, report media and notifications, while retaining minimal de-identified booking/payment facts needed for accounting, refunds, fraud and disputes. Public policy text and actual deletion code must stay aligned.

Collect only required fields, restrict support/log access, define production retention periods and document Stripe, Resend, Expo, storage and hosting processors in store privacy disclosures.

## 10. Logging, alerts and incident response

Operational alerts cover Stripe webhook failures, mail failures and stale refunds. Logs/alerts must exclude passwords, JWTs, reset tokens, object credentials, full provider payloads and unnecessary personal/media content.

Before public use, choose centralized error/log monitoring, define severity/on-call ownership and test incidents: leaked key, account compromise, cross-user access report, failed webhook, duplicate payment and unavailable database. Response includes containment/rotation, evidence preservation, customer/legal assessment, recovery/reconciliation and post-incident corrective work.

## 11. Production launch checklist

- Strong unique JWT secret and least-privilege provider credentials.
- Explicit HTTPS CORS/public/storage/alert domains.
- Live Stripe key and endpoint-specific webhook secret; dashboard MFA.
- Managed PostgreSQL TLS/private network, backups and restore test.
- Object-storage CORS/lifecycle and no legacy base64 data.
- Resend SPF/DKIM and restricted sender domain.
- APNs/FCM/EAS keys stored outside Git.
- Dependency and container vulnerability review.
- Full authorization E2E and physical-device regression.
- Privacy/Data Safety disclosures and support contact.
- Monitoring, alert receiver and incident owner confirmed.

## 12. Known limits and future hardening

Helmet/CSP, metadata-only request logging, global throttling, rotating per-device sessions, private signed media reads and push receipt processing are implemented. Platform-superadmin, centralized SIEM/error tracking, edge WAF configuration and independent penetration testing remain external gaps. Real private-bucket/provider/device verification, monitoring and penetration testing remain production evidence gates.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-07 | 1.0 | Documented implemented authentication, authorization, payment, media, deletion and configuration controls plus production responsibilities and known limits. |
| 2026-08-08 | 1.1 | Added Helmet/CSP, global throttling and privacy-safe request logging; elevated private media, monitoring, provider verification and penetration testing to explicit release evidence gates. |
| 2026-08-09 | 1.2 | Added rotating per-device refresh sessions and resource-authorized private media reads; retained real-provider verification as a release gate. |

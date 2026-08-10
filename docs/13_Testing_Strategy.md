# Y&T Paws Platform — Testing Strategy

**Version:** 1.1
**Updated:** 2026-08-10
**Status:** Implemented baseline; external-provider certification remains blocked pending provisioned accounts.

## 1. Quality gates

Every change must pass locked dependency installation, Prisma generation/migration, backend build, backend unit coverage thresholds, backend E2E tests, generated OpenAPI drift, production Docker build, App TypeScript checks, App policy tests and documentation/configuration drift checks. CI uploads the backend coverage artifact.

## 2. Test layers

| Layer | Current purpose | Gate |
|---|---|---|
| Backend unit | Provider errors, mail, alerts, refund monitoring, media authorization and payment state helpers | CI |
| Backend E2E | Real Nest module graph and PostgreSQL constraints/transactions/authorization | CI with isolated PostgreSQL |
| App policy | Release URL validation and care-information visibility | CI |
| Type/build | API/App compilation and production container artifact | CI |
| Provider integration | Stripe live webhook/refund, real WeChat account, Resend domain, S3/R2 and Expo APNs/FCM | Production release evidence gate |
| Security/operations | Penetration test, monitoring event, backup restore and rollback drill | Production release evidence gate |

## 3. E2E coverage map

Tests are grouped by risk domain rather than one file per Nest module. File count is therefore not a coverage metric.

| E2E suite | Covered behavior |
|---|---|
| `app.e2e-spec.ts` | Auth protection, public support, health/readiness and database-enforced single-Business invariant |
| `auth-security.e2e-spec.ts` | Staff status, JWT/refresh rotation, per-device revocation, password/reset security, rate limits, account deletion and retention |
| `booking-permissions.e2e-spec.ts` | Pets, health records, care details, reports permissions, notifications, multi-device tokens, capacities, assignment and cancellation |
| `payments.e2e-spec.ts` | Services/business settings, price snapshots, Stripe/WeChat concurrency, webhooks, refunds and duplicate-payment recovery |

Media upload roles and protected read authorization have focused unit tests. Push receipt success/error cleanup has unit coverage. Gaps that remain release-relevant are real private object-storage behavior, receipts on physical devices and live-provider timing; mocks cannot certify those.

## 4. Required regression boundaries

- Authorization tests include an allowed user and a same-business or cross-customer denied user.
- Money/state transitions test duplicate and concurrent delivery, not only happy paths.
- Tenant assumptions must have a PostgreSQL constraint test; application `count` checks alone are insufficient.
- New device/session data must test multi-device behavior and targeted removal.
- Every production configuration guard needs positive and negative tests.
- A fixed bug must receive a regression test at the lowest layer that can reproduce it faithfully.

## 5. Coverage policy

Jest coverage instrumentation is enabled with the reviewed initial global floor: statements 13%, branches 12%, functions 12%, lines 12%. These deliberately low baseline thresholds prevent regression while E2E-only paths are not counted by unit instrumentation. Critical-flow and database-race E2E boundaries remain mandatory.

## 6. Release certification

Each release variable uses `owner|verifiedAt|expiresAt|reference`. The checker rejects missing owners, future/malformed verification dates, expired evidence and non-traceable references, then emits an uploaded validation manifest.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-08 | 1.0 | Defined repository and external-provider gates, mapped real E2E coverage and separated mock confidence from production certification. |
| 2026-08-10 | 1.1 | Added enforced coverage floors/artifacts, generated OpenAPI drift and structured expiring release evidence. |

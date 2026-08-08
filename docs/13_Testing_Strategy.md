# Y&T Paws Platform — Testing Strategy

**Version:** 1.0
**Updated:** 2026-08-08
**Status:** Implemented baseline; external-provider certification remains blocked pending provisioned accounts.

## 1. Quality gates

Every change must pass locked dependency installation, Prisma generation/migration, backend build, backend unit tests, backend E2E tests, production Docker build, App TypeScript checks, App policy tests and documentation/configuration drift checks. A production promotion must additionally pass `npm run release:check` in `yt-paws-backend` with traceable evidence values.

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
| `auth-security.e2e-spec.ts` | Staff status, JWT revocation, password/reset security, rate limits, account deletion and retention |
| `booking-permissions.e2e-spec.ts` | Pets, health records, care details, reports permissions, notifications, multi-device tokens, capacities, assignment and cancellation |
| `payments.e2e-spec.ts` | Services/business settings, price snapshots, Stripe/WeChat concurrency, webhooks, refunds and duplicate-payment recovery |

Media purpose/role validation has focused controller tests. Gaps that remain release-relevant are real object-storage upload/read/delete behavior, push receipts on physical devices, and live-provider timing; mocks cannot certify those.

## 4. Required regression boundaries

- Authorization tests include an allowed user and a same-business or cross-customer denied user.
- Money/state transitions test duplicate and concurrent delivery, not only happy paths.
- Tenant assumptions must have a PostgreSQL constraint test; application `count` checks alone are insufficient.
- New device/session data must test multi-device behavior and targeted removal.
- Every production configuration guard needs positive and negative tests.
- A fixed bug must receive a regression test at the lowest layer that can reproduce it faithfully.

## 5. Coverage policy

No percentage target is claimed until instrumentation is enabled; percentage alone would overvalue DTO/accessor lines and undervalue payment races. CI instead enforces critical-flow and invariant coverage listed above. Adding Jest coverage thresholds is a follow-up after a baseline report is reviewed and generated artifacts are excluded.

## 6. Release certification

The release owner records dated evidence for all variables checked by `release:check`. Values should be links or identifiers for test runs, provider events, reports or incident drills—not `true`. Missing evidence blocks production promotion even when unit/E2E tests pass.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-08 | 1.0 | Defined repository and external-provider gates, mapped real E2E coverage and separated mock confidence from production certification. |

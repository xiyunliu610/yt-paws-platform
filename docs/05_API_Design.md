# Y&T Paws Platform — API Design

**Version:** 1.2
**Updated:** 2026-08-09
**Status:** Implemented REST API inventory for the current NestJS backend.

## 1. Conventions

- JSON over HTTPS; production terminates TLS at the hosting platform or reverse proxy.
- Authenticated calls send `Authorization: Bearer <JWT>`.
- UUID path parameters are validated. Unknown body fields are rejected by the global validation pipe.
- Dates are ISO 8601 strings in UTC. Money is stored as PostgreSQL decimal and serialized as JSON numbers by the global interceptor.
- Success uses the natural HTTP status (`200`, `201`); validation/authorization/conflict failures use NestJS JSON errors with `statusCode`, `message`, and `error` where applicable.
- There is no `/api/v1` prefix in the shipped V1 contract. Migration path: first add `/api/v1` aliases without removing existing routes; ship an App using only the aliases; measure/support the minimum old App version through a published sunset window; then freeze unprefixed routes and put the first breaking contract under `/api/v2`. A prefix must never be introduced by breaking installed store clients in place.
- OpenAPI generation is not installed. CI instead performs a minimum route-inventory drift check: every controller method/path must appear in this document. DTO/schema and response-shape drift still requires review and is a tracked limitation; OpenAPI generation should replace the hand-maintained schema layer before external API consumers exist.

Roles are `customer`, `staff`, `owner`, and business-scoped `admin`. JWT validation also checks `isActive`, `deletedAt`, `tokenVersion`, and the temporary-password gate. Staff with `mustChangePassword=true` may only complete the password-change flow before accessing business endpoints.

## 2. Public and health endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Basic service response. |
| GET | `/health/live` | Process liveness. |
| GET | `/health/ready` | Readiness with `SELECT 1` database probe. |
| GET | `/privacy` | Hosted privacy policy page. |
| GET | `/terms` | Hosted service terms page. |
| GET | `/account-deletion` | External deletion instructions/request page. |
| GET | `/support` | Public support page. |
| GET | `/reset-password` | Browser fallback for password-reset deep links. |

## 3. Authentication and staff

| Method | Path | Access | Request / result |
|---|---|---|---|
| POST | `/auth/register` | Public | Customer email/password/profile → user and JWT. |
| POST | `/auth/login` | Public | Credentials → user and JWT; persistent lockout/rate-limit checks apply. |
| POST | `/auth/refresh` | Refresh token | Atomically rotate the hashed refresh token and return a new access/refresh pair. |
| POST | `/auth/logout` | JWT | Revoke the caller's current device session. |
| GET | `/auth/sessions` | JWT | List active device sessions without token hashes. |
| DELETE | `/auth/sessions/:id` | JWT | Revoke one caller-owned device session. |
| POST | `/auth/forgot-password` | Public | Email → generic response; sends one-use reset link without disclosing account existence. |
| POST | `/auth/reset-password` | Public | Token and new password → new JWT; token is hashed, expiring and single-use. |
| PATCH | `/auth/change-password` | JWT | Current/new password → new JWT and invalidation of older sessions. |
| DELETE | `/auth/account` | JWT | Password confirmation → account anonymization/deletion result. |
| POST | `/auth/register-business` | Public bootstrap only | Creates the first business and owner; rejects after a Business exists. |
| POST | `/auth/staff` | owner/admin | Creates staff and returns a temporary password. |
| GET | `/auth/staff` | owner/admin | Lists staff in the caller's business. |
| PATCH | `/auth/staff/:id/status` | owner/admin | `{ isActive }`; cannot disable self or the last active owner. |
| PATCH | `/auth/staff/:id/capacity` | owner/admin | Nullable positive concurrent-booking limit. |

Login and forgot-password protections are backed by `SecurityEvent` records keyed by IP and normalized-email hash. Production must keep `EXPOSE_PASSWORD_RESET_TOKEN=false`.

## 4. Pets and care records

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/pets` | JWT customer | Create an owned pet. |
| GET | `/pets` | JWT | List caller-owned pets. |
| GET | `/pets/:id` | JWT owner of pet | Read one pet. |
| PATCH | `/pets/:id` | JWT owner of pet | Update profile and object-storage photo URL. |
| POST | `/pets/:id/health-records` | JWT owner of pet | Add vaccination/deworming record. |
| GET | `/pets/:id/health-records` | JWT owner of pet | List health history. |

Staff do not receive general pet access. Booking-specific care information is exposed only through `/bookings/:id/care-details` to the customer, assigned staff, or same-business manager.

## 5. Services, business and media

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/services` | JWT | Customers receive active services for the V1 business; managers receive their business catalogue. |
| POST | `/services` | owner/admin | Create service, price/pricing unit and optional capacity. |
| PATCH | `/services/:id` | owner/admin | Update or archive a service. Services are not hard-deleted. |
| GET | `/businesses/me` | owner/admin | Read business settings. |
| PATCH | `/businesses/me` | owner/admin | Update name/region/QR URL/business capacity. Explicit null clears nullable values. |
| POST | `/media/upload-url` | JWT, purpose-scoped | Request a presigned object-storage upload URL for `pet`, `report`, or `wechat-qr`. |
| GET | `/media/files/:encodedKey` | JWT, resource-scoped | Authorize media access and redirect to a 60-second signed object URL. |

Media upload is two-step: request URL, then PUT directly to a private bucket. PostgreSQL stores an authenticated API locator, never a new public object URL. Reads re-check pet/report/business authorization before issuing a 60-second signed GET redirect.

## 6. Bookings and reports

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/bookings/mine` | JWT | Customer: own bookings; staff: assigned bookings; manager: business bookings. |
| POST | `/bookings` | JWT customer | Create booking with pet/service/time; snapshots price and checks overlap/capacity transactionally. |
| GET | `/bookings/:id/care-details` | customer/assigned staff/manager | Minimum booking-scoped pet health and contact data. |
| PATCH | `/bookings/:id/cancel` | customer or manager | Cancel pending/confirmed booking strictly earlier than 24 hours before start. Does not refund Payment. |
| PATCH | `/bookings/:id/assign` | owner/admin | Assign same-business active staff with staff-capacity check. |
| PATCH | `/bookings/:id/status` | owner/admin | Advance permitted booking states. |
| POST | `/reports/:bookingId` | assigned staff/manager | Create text/media daily report. |
| GET | `/reports/:bookingId` | customer/assigned staff/manager | List reports for an authorized booking. |

Booking states follow `pending → confirmed → in_progress → completed`; eligible pending/confirmed bookings may become `cancelled`. Capacity null means unlimited. Active overlap checks apply independently to pet, business, service and assigned staff.

## 7. Payments

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/payments/stripe/webhook` | Stripe signature | Raw-body verified Checkout/refund event processing. |
| POST | `/payments/stripe/:bookingId` | booking customer | Create/reuse Stripe payment and a fresh Checkout Session using the supplied allow-listed return URL. |
| POST | `/payments/wechat/:bookingId` | booking customer | Create/reuse WeChat QR payment instructions. |
| PATCH | `/payments/:id/mark-paid` | payment customer | Customer declares WeChat transfer sent. |
| PATCH | `/payments/:id/verify` | owner/admin | Confirm WeChat receipt. |
| PATCH | `/payments/:id/refund` | owner/admin | Full refund with reason; Stripe is provider-driven, WeChat requires explicit confirmation of manual transfer. |
| POST | `/payments/:id/reconcile-refund` | owner/admin | Recover a Stripe payment left in `refund_pending`. |
| GET | `/payments/mine` | JWT customer | Customer payment history. |
| GET | `/payments/business` | owner/admin | Business payment queue/history. |
| GET | `/payments/:id` | authorized JWT | Read one payment subject to ownership/business rules. |

Amounts come from the Booking snapshot, never from App input. Stripe webhook authenticity uses `STRIPE_WEBHOOK_SECRET`; Session IDs and PaymentIntent IDs are persisted. Database partial unique indexes and provider idempotency keys protect retries and cross-method races. Switching methods expires/cancels the superseded active attempt where possible.

## 8. Notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/notifications/mine` | JWT | List caller notifications. |
| PATCH | `/notifications/:id/read` | notification owner | Mark one row read. |
| PATCH | `/notifications/register-device` | JWT | Upsert one Expo device token; a user may own multiple device rows. |
| PATCH | `/notifications/unregister-device` | JWT | Remove only the supplied current-device token on logout. |

In-app notification rows are authoritative. Current system-event payloads include English and Chinese text. Remote push fans out to every registered device, remains best-effort and must be verified on EAS-built physical devices with APNs/FCM credentials.

## 9. Security and operational behavior

- CORS is configured from production allow-lists; raw wildcard production CORS is prohibited.
- Passwords use bcrypt; reset tokens are never stored in plaintext.
- Authorization is enforced in services as well as route roles, including ownership, business scope and assigned-staff checks.
- Stripe webhook, mail delivery and refund reconciliation failures emit operational alerts.
- Clients may retry read calls. Financial mutation retries are safe only where documented idempotency/database invariants apply.
- `/health/live` is for process probes; `/health/ready` is for rollout and traffic readiness.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-07 | 1.0 | Recorded the implemented endpoint inventory, access rules, state transitions, media flow and payment guarantees. |
| 2026-08-08 | 1.1 | Added a backward-compatible API-version migration path, multi-device notification contract and CI controller-route drift detection; explicitly recorded the remaining lack of generated OpenAPI schemas. |
| 2026-08-09 | 1.2 | Added refresh/logout/session-revocation endpoints and authenticated private-media reads. |

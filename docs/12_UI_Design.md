# Y&T Paws Platform — UI Design

**Version:** 1.0
**Updated:** 2026-08-08
**Status:** Current V1 implementation baseline.

## 1. Principles

- English and Simplified Chinese are equal product surfaces; navigation, actions, errors, dates and system notifications must not be English-only.
- Role-based navigation exposes only actions the backend authorizes. Hiding UI is usability, never the security boundary.
- Destructive and financial actions require explicit confirmation, visible state and recoverable error feedback.
- Empty, loading, denied and failed states are designed states, not blank screens.
- The visual system uses warm neutral backgrounds, dark green primary actions and high-contrast status/error colors.

## 2. Navigation by role

| Role | Primary surfaces |
|---|---|
| Customer | Home, booking, pets, booking details/care reports, payments, notifications, profile/help |
| Staff | Assigned work, booking care information, daily report composition, notifications, profile |
| Owner/admin | Business home, booking lifecycle/assignment, staff/services/settings, payment verification/refunds, notifications |

The V1 `admin` UI is business-scoped and owner-equivalent. It is not a platform-superadmin console.

## 3. Shared interaction requirements

- Forms disable submission while pending and surface server validation without discarding entered data.
- Network sections expose retry actions when retry is safe.
- Dates use the selected locale while API/storage values remain ISO timestamps.
- Images have a non-image fallback; uploads enforce photo type/count/size before transfer.
- Payment state is read from the backend after provider return; redirects are not treated as proof of payment.
- Care information is visible only to the booking customer, assigned staff and same-business owner/admin.

## 4. Accessibility and store gate

Before store submission, verify dynamic text scaling, screen-reader labels for icon-only controls, color contrast, touch targets, keyboard avoidance, reduced-motion behavior and both language layouts on small and large physical devices. Accessibility failures on authentication, booking, payment, cancellation, refund or account deletion block release.

## 5. Known gaps

The repository does not yet contain automated screenshot/visual-regression or accessibility tests. Physical-device review, final store assets and provider-hosted Stripe screens remain release checklist items.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-08 | 1.0 | Recorded the shipped role navigation, bilingual/error-state rules and store accessibility gate. |

# 02 · Product Requirements Document

**Document Status:** Draft v0.17
**Related Document:** `01_Project_Overview.md`
**Last Updated:** 2026-08-02
**Maintainer:** Xiyun Liu (Product Owner & Developer)
**Scope:** Version 1 (six core modules, of equal priority, sequenced according to current development progress)

> **Naming and Tenant Scope Note:** In this document, "the platform" refers to **PetHome**; the only business currently onboarded is **Y&T Paws**. Version 1's functional scope still serves Y&T Paws exclusively; however, the data model reserves fields such as `business_id` from Version 1 onward to support future multi-business expansion (see Section 11 of `01_Project_Overview.md` and `04_Database_Design.md`). References to "business / service provider" in the User Stories below currently refer to Y&T Paws.

---

## Usage Notes

This document uses the User Story + Acceptance Criteria (Given/When/Then) format. The purpose is:

- During development, acceptance criteria can be checked directly to self-verify whether a feature is complete
- Acceptance criteria can later be converted directly into test cases (unit / e2e)
- The PRD stays in sync with the codebase — when functionality changes, this document is updated rather than left to go stale

Each module corresponds to a backend module (see `03_System_Architecture.md`); User Stories within a module are not ordered by priority.

---

## User Roles

Before diving into individual modules, roles need to be defined clearly — because future AI permissions, camera viewing permissions, notification scope, and chat permissions will all be determined by role. Defining the role enum now means the database schema won't need to change later when permission logic is added.

| Role | Description | Implemented in Version 1? |
|---|---|---|
| **Customer** | The platform's end user: books services, manages pet profiles, views daily reports | ✅ Implemented |
| **Business Owner** (currently Y&T Paws) | Manages bookings, confirms payments, publishes daily reports, views their own business's operational data | ✅ Implemented |
| **Staff** | As a business grows, the Business Owner creates staff accounts under their business and assigns incoming bookings to them to carry out; staff have no business-level admin permissions (e.g. payment verification, account management) | ✅ Implemented — see US-03.5/US-03.6 |
| **System Administrator** | Represents the PetHome platform operator itself (not a business), for cross-business, system-level management, in preparation for future multi-business SaaS (Version 4) | ⚠️ Not implemented as described — see note below |

**Design Principle:** The `User` table includes a `role` field from Version 1 onward (enum: `customer` / `staff` / `owner` / `admin`) — this avoids a future data migration. **Current behavior differs from the row above:** every endpoint guarded `@Roles('owner', 'admin')` (bookings, payments, services, businesses, staff management) treats `admin` as a second owner-equivalent role scoped to the same `businessId`, since these guards also require `user.businessId === resource.businessId`. There is no cross-business "platform admin" code path — a real `System Administrator` role, most likely without a `businessId` at all, is still Version 4 work, not something already reserved and dormant. See `04_Database_Design.md` for detailed field design.

**Staff assignment scope (decided 2026-07-22):** Version 1 supports the Business Owner assigning a booking to one of their staff internally (`Booking.assignedStaffId`). Customers choosing a specific staff member themselves is explicitly deferred — it needs staff profile pages, availability, and possibly ratings, none of which are justified while Y&T Paws has only a handful of staff. Revisit once the owner-assignment flow is validated in real use and staff headcount grows; it should layer on top of the existing design (customer selection would just pre-fill `assignedStaffId` subject to the owner's confirmation) rather than requiring rework.

Throughout this document, "user / customer" refers to the `Customer` role, and "business / service provider" refers to the `Business Owner` role (currently Y&T Paws).

---

## Module 1: Auth

Corresponding backend module: `auth`

### US-01.1 Email Registration
> As a new user, I want to register an account using email and password, so that I can use the platform to book services.

**Acceptance Criteria**
- Given the user enters a valid email and a password meeting the strength requirements, When the user submits registration, Then the system creates the account and returns a JWT token and user info
- Given the entered email is already registered, When the user submits registration, Then the system shows "email already exists" and does not create a duplicate account
- Given the user's password does not meet the minimum strength requirement, When the user submits registration, Then the system displays the password rules and blocks submission

*Already implemented: `POST /auth/register` has been verified end-to-end, returning a JWT and user info.*

### US-01.2 Login
> As a registered user, I want to log in using email and password, so that I can access my account and booking history.

**Acceptance Criteria**
- Given the user enters the correct email and password, When they submit login, Then the system returns a JWT token; the frontend stores the token and navigates to the home screen
- Given the user enters an incorrect password, When they submit login, Then the system returns an error message and no token is issued
- Given an unauthenticated user tries to access a page requiring authentication, When the request is made, Then the system returns 401 and the frontend redirects to the login page

### US-01.3 Language Selection
> As a Chinese-speaking or New Zealand user, I want to choose a Chinese or English interface, so that I can use the platform in my preferred language.

**Acceptance Criteria**
- Given a user opens the app for the first time, When no language has been set, Then the system suggests a default based on device language, and the user can switch manually
- Given the user switches language, When the change takes effect, Then all interface text and date formats update immediately, and the setting is persisted for next launch

### US-01.4 Business (Owner) Registration — bootstrap-only as of 2026-07-30
> Originally: "As a pet care business owner (a 'sitter'), I want to register my own business on the platform myself..." — see `01_Project_Overview.md` §11 for why this changed. V1 serves Y&T Paws exclusively; `POST /auth/register-business` now exists only to have created that one `Business` row, not as a repeatable onboarding flow.

**Acceptance Criteria**
- Given no `Business` row exists yet, When someone submits a business name plus their own email/password/name, Then the system creates that `Business` row and a `User` with role `owner` and `businessId` pointing to it, and returns a JWT token like normal registration
- Given a `Business` row already exists (true in every real environment after the first run), When anyone submits this form, Then the system rejects it with 403 — there is no path to a second tenant in Version 1
- Given the email is already registered, When they submit, Then the system rejects it with "email already exists" (same rule as US-01.1)
- Out of scope for Version 1: business verification/approval workflow, billing/subscription for the business itself, and (now) any UI for this at all — a customer-facing "Register Business" entry point would only ever be able to fail, so it was removed from the app rather than left as a dead end

*Already implemented: `POST /auth/register-business`, now bootstrap-only (`AuthService.registerBusiness` checks `Business` row count). The `RegisterBusinessScreen` and its "Register Business" link on the login screen were removed from the app (2026-07-30) along with the now-dead `authApi.registerBusiness` client call — none of the three had a reachable path to success once a `Business` already exists.*

### US-01.5 Password and Session Security
> As a user, I want to reset or change my password and have older sessions revoked, so that a lost credential does not keep granting access.

**Acceptance Criteria**
- Forgot-password always returns the same generic response, whether an account exists or not
- Reset tokens are random, stored only as SHA-256 hashes, expire after 30 minutes and work once
- Password change/reset increments `User.tokenVersion`; every older JWT returns 401 on its next request
- A newly created staff account is marked `mustChangePassword`; both App navigation and authenticated backend routes block business access until successful password change
- Resend sends a link to the public reset landing page. Installed Apps open `ytpaws://reset-password`; without the App, the same page provides a web reset form
- Login and reset requests are rate-limited by both IP and email hash; five consecutive bad passwords lock the account for 15 minutes and security events are persisted without plaintext email search keys
- Production startup rejects `EXPOSE_PASSWORD_RESET_TOKEN=true`; raw reset tokens are available only to opted-in non-production tests

### US-01.6 Staff Activation and Account Deletion
> As an owner or user, I want safe staff offboarding and account deletion, so that former users immediately lose access and personal data is not retained unnecessarily.

**Acceptance Criteria**
- Owner/admin can activate/deactivate a staff/owner account only within their own business
- A manager cannot deactivate themselves or the last active Owner; this invariant is checked in a Serializable transaction
- Deactivation increments `tokenVersion`, clears the push token and invalidates current JWTs immediately
- Profile exposes password-confirmed account deletion with two destructive confirmations
- The last active Owner cannot delete their account
- Deletion anonymizes the User, removes notifications/reset tokens, clears pet profiles/photos/health records and report text/media, unassigns staff bookings and removes the `refundedBy` personal reference
- Booking/Service/Payment financial facts remain for accounting, refund, fraud and dispute records; the deleted customer identity is represented only by the anonymized User id/email

---

## Module 2: Pets

Corresponding backend module: `pets`

### US-02.1 Add Pet Profile
> As a logged-in user, I want to add my pet with minimal friction and fill in the rest of its profile later, so that registering a pet doesn't feel like a long form before I can even book something.

**Decided 2026-07-31 (was: require name + breed together at creation — see the superseded AC below).** Progressive profile-building is the accepted V1 behavior, not a shortcut to later correct: creation only requires a name; species, breed, age, weight, spay/neuter status, personality, dietary notes, and a photo are all optional at creation time and can be added afterwards via the pet's detail screen (US-02.2). A booking can be created against a pet with only a name on file — V1 has no per-service "this pet profile isn't complete enough" gate, and none is planned; if a business needs specific information before a stay (e.g. dietary notes for boarding), that's handled the same way it is today, outside the app (a conversation with the customer), not a submission blocker.

**Acceptance Criteria**
- Given the user taps "Add Pet" in their account, When they enter a name and submit, Then the system creates a Pet record linked to the current user
- Given the name field is empty, When the user submits, Then the system blocks submission and highlights the missing field
- Given the user uploads a pet photo (at creation or later via US-02.2), When the upload succeeds, Then the photo displays on the pet's profile card

*Already implemented: `POST /pets` requires only `name`. Creation is wired into the app as a minimal name + species form in two places (`ProfileScreen` and `BookingScreen`). Remaining fields are filled in via `PetDetailScreen`; photos use the S3-compatible presigned upload flow and PostgreSQL stores only the resulting HTTPS URL.*

<details>
<summary>Superseded AC (pre-2026-07-31): require name + breed at creation</summary>

- Given the user taps "Add Pet" in their account, When they fill in name, breed, age, weight, spay/neuter status, personality description and dietary notes and submit, Then the system creates a Pet record linked to the current user
- Given required fields (name, breed) are empty, When the user submits, Then the system blocks submission and highlights the missing fields

This was never actually built this way — `POST /pets` only ever required `name` — and the decision above is that the simpler behavior is correct, not a gap to close.
</details>

### US-02.2 View/Edit Pet Profile
> As a logged-in user, I want to view and edit information for pets I've already added, so that I can keep it up to date.

**Acceptance Criteria**
- Given a user has multiple pet profiles, When they open "My Pets", Then the system displays all pet cards belonging to that user
- Given the user edits a field and saves, When the save succeeds, Then the update takes effect immediately and is used in future bookings

*Already implemented: `GET /pets` is wired into `ProfileScreen`'s "My Pets" list (showing the pet's photo when set), which navigates into `PetDetailScreen` for editing. `PATCH /pets/:id` is called from that screen's save button, covering name, photo, species, breed, age, weight, personality, diet notes and neutered status.*

### US-02.3 Health Record Association (PetHealthRecord)
> As a logged-in user, I want to record health-related information for my pet (e.g. vaccinations, medical history), so that care providers can reference it in an emergency.

**Acceptance Criteria**
- Given the user adds a health record on the pet profile page, When submitted, Then the record is linked to that Pet and displayed in chronological order
- Given a pet has no health records, When viewing that pet's profile, Then the system shows "No health records yet" rather than an error

*Already implemented: `POST/GET /pets/:id/health-records`, wired into `PetDetailScreen` as a "Health Records" section (list plus an inline add-record form with type/date/notes).*

---

## Module 3: Bookings / Services

Corresponding backend modules: `services`, `bookings`

### US-03.1 Browse Service List
> As a user, I want to see the available care service types and prices, so that I can choose a suitable service.

**Acceptance Criteria**
- Given a user opens the "Booking" page, When the page loads, Then the system displays all published services (boarding / drop-in visits, etc.) with name, price and duration
- Given a service is currently unavailable (e.g. delisted), When the list loads, Then that service is hidden or marked "currently unavailable"

*Already implemented: `GET /services` (customer view returns only `isActive` services), wired into `BookingScreen`. Services also carry a `pricingUnit` field (`flat` | `per_day`, default `flat`) so a service can either charge once per booking (grooming, house visit) or scale with the number of days booked (boarding) — see `03_System_Architecture.md` §4.1 for the field, and US-04.1 below for how it feeds into the payment amount.*

### US-03.2 Create a Booking
> As a logged-in user, I want to select a service, my pet, and a date/time range and submit a booking, so that I can arrange care.

**Acceptance Criteria**
- Given the user selects a service, pet, and start/end dates, When they submit the booking, Then the system creates a Booking record with status "Pending Confirmation"
- Given the user has no pet profiles, When they attempt to create a booking, Then the system prompts "Please add a pet first" and guides them to do so
- Given the selected time slot conflicts with an existing booking (e.g. the business's capacity is full), When submitted, Then the system flags the conflict and blocks creation

*Implemented: `POST /bookings` is wired into `BookingScreen`, including inline pet creation. Conflict checks run in a Serializable transaction and cover the same pet plus optional business-wide and per-service concurrent limits. `Business.maxConcurrentBookings` and `Service.maxConcurrentBookings` default to null (unlimited) and are owner-configurable. One booking represents one pet, so a service limit covers boarding pet count and grooming time-slot concurrency without hard-coding service names. Staff capacity is checked separately when an owner assigns a booking.*

### US-03.3 View Booking Status
> As a logged-in user, I want to view my booking history and current status, so that I understand the progress of my service.

**Acceptance Criteria**
- Given a user opens "My Bookings", When the page loads, Then bookings are shown in reverse chronological order with status (pending / confirmed / in progress / completed / cancelled)
- Given a booking's status changes (e.g. the business confirms it), When the status updates, Then the user sees the latest status in real time or on next app open

*Already implemented: `GET /bookings/mine` (role-aware — customer/staff/owner each see their own natural slice, joined with pet/service names) powers both the "Upcoming" widget on `HomeScreen` and the dedicated `MyBookingsScreen` history list (`ProfileScreen`'s "My Bookings" menu item), which opens into `BookingDetailScreen` for a single booking. Booking status advances via the business side (`PATCH /bookings/:id/status`); `BookingDetailScreen` now exposes this to the owner/admin as a single "advance to next status" button (label changes per current status: Confirm Booking / Start Service / Mark Completed), reusing the same forward-only pending → confirmed → in_progress → completed sequence the backend enforces. Staff cannot advance status (matches the backend's owner/admin-only guard).*

### US-03.4 Cancel a Booking
> As a logged-in user, I want to cancel a booking within the allowed time window, so that I can respond to schedule changes.

**Acceptance Criteria**
- Given a booking's status is "Pending Confirmation" or "Confirmed" within the cancellation policy window, When the user taps cancel, Then the system updates the status to "Cancelled" and releases the time slot
- Given a booking has passed the non-cancellable time window (exact rule to be confirmed with the business), When the user attempts to cancel, Then the system shows that cancellation is not allowed and why

*Implemented: `PATCH /bookings/:id/cancel` is available to the booking customer and owner/admin while pending/confirmed. Both customer and business follow the same policy: cancellation is rejected from 24 hours before the service start time onward. Staff cannot cancel.*

### US-03.5 Business Owner Creates a Staff Account
> As a Business Owner, I want to create an account for a staff member under my business, so that I can start assigning them bookings.

**Acceptance Criteria**
- Given the Business Owner submits a new staff member's name, email and phone, When they submit, Then the system creates a User with role `staff` and `businessId` set to the owner's business, and returns login credentials for that staff member
- Given the email is already registered, When the owner submits, Then the system rejects it with "email already registered" (same rule as US-01.1)
- Given the requester is not a Business Owner (or Admin) for that business, When they call this action, Then the system returns 403

*Already implemented: `POST /auth/staff` (creates the account, returns a temporary password) plus a supporting `GET /auth/staff` (lists the business's staff/owner users, added to back both this screen and the booking-assignment picker below), wired into a new owner-only `StaffManagementScreen` (reachable from `ProfileScreen`'s "Manage Staff" quick action, shown only to owner/admin). The temporary password is surfaced in a one-time confirmation dialog after creation, matching the backend's "relay it manually, no email infra yet" approach.*

### US-03.6 Business Owner Assigns a Booking to Staff
> As a Business Owner, I want to assign an incoming booking to one of my staff, so that the right person carries it out.

**Acceptance Criteria**
- Given a booking belongs to the owner's business and a staff member also belongs to that business, When the owner assigns the booking to that staff member, Then `Booking.assignedStaffId` is set and the staff member can see the booking in their own list
- Given the chosen staff member belongs to a different business, When the owner attempts the assignment, Then the system rejects it
- Given a booking is reassigned to a different staff member, When the change is saved, Then only the newly assigned staff member sees it going forward (the previous assignee loses visibility)
- Out of scope for Version 1: customers choosing their own staff member (see User Roles section above)

*Already implemented: `PATCH /bookings/:id/assign`, wired into `BookingDetailScreen` as a row of tappable staff chips (owner/admin only), backed by the same `GET /auth/staff` list used by `StaffManagementScreen`. Reassignment (tapping a different staff member) is supported, matching the AC that only the newly assigned staff member sees it afterward.*

### US-03.7 Business Owner Manages Services (added 2026-07-31)
> As a Business Owner, I want to create, edit, price, and publish/unpublish my own services, so that I can run day-to-day service configuration myself instead of asking someone to edit the database directly.

**Acceptance Criteria**
- Given the owner opens "Manage Services", When the page loads, Then it lists every service on their business, including delisted ones (not just what customers currently see)
- Given the owner adds a new service with a name and a non-negative price, When they save, Then the service is created and immediately visible in the list
- Given the owner edits a service's name, description, price, pricing unit, or duration, When they save, Then the changes apply immediately — including to bookings placed *after* the edit; already-placed bookings keep their price snapshot (see `03_System_Architecture.md` §4.1) unaffected
- Given the owner toggles a service active/inactive, When the toggle changes, Then customers immediately stop (or start) seeing it in their service list
- Out of scope for Version 1: deleting a service outright. **V1 never deletes a Service that has Bookings against it — archiving via `isActive: false` is the only way to retire one.** A hard-delete endpoint isn't a missing feature to add later; a `Booking.serviceId` pointing at a deleted row would break price-history/reporting for every past booking against it, so this is deliberate, not an oversight

*Already implemented: this closes a gap where `POST /services` and `PATCH /services/:id` (owner/admin only) existed on the backend from V1's start but had no UI — an owner could not configure their own services without calling the API directly. `ServiceManagementScreen` (reachable from `ProfileScreen`'s "Manage Services" quick action, owner/admin only) lists every service via the same `GET /services` customers use (which returns the full list, active or not, for owner/staff roles — see `03_System_Architecture.md` §4.2), with an add form and a tap-to-expand edit form per service, plus a switch for the active/inactive toggle.*

---

## Module 4: Payments

Corresponding backend module: `payments`

### US-04.1 New Zealand User — Stripe Payment
> As a New Zealand user, I want to pay for my booking online via Stripe, so that I can quickly confirm my booking.

**Acceptance Criteria**
- Given the user has completed booking details, When they choose Stripe payment, enter card details and submit, Then the system charges via Stripe and marks the Booking as "Paid"
- Given the Stripe payment fails (e.g. card declined), When the failure result is returned, Then the system shows the failure reason, the Booking remains "Pending Payment", and retry is allowed

*Already implemented (frontend added 2026-07-28): `POST /payments/stripe/:bookingId` now creates a Stripe **Checkout Session** (a Stripe-hosted payment page), not a raw PaymentIntent — chosen specifically so the app never needs a native Stripe SDK or a card-entry form; `POST /payments/stripe/webhook` verifies the signature and marks the `Payment` `paid`/`failed` on `checkout.session.completed`/`checkout.session.expired`. Note this marks the associated `Payment.status`, not `Booking.status` — `Booking` has no "paid" state in its enum, by design (see `03_System_Architecture.md` §6). `PaymentScreen` now has a Card/WeChat method selector; the Card tab's "Pay with Card" button calls `initiateStripe` with a `Linking.createURL()`-derived return URL, opens `checkoutUrl` via `expo-web-browser`'s `openAuthSessionAsync` (works inside Expo Go — no dev-client build needed), and on return polls a new `GET /payments/:id` a few times to reflect the outcome, since the redirect itself is only a UX signal, never proof of payment. Still untested against a real Stripe account — `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` remain unset in `.env`; the business owner needs to supply their own Stripe test keys before this can be exercised end to end.*

**App Review note:** “Payments in this app are exclusively for physical pet boarding and pet-care services delivered outside the app. No digital content, app functionality, subscriptions, or virtual goods are sold.” This maps to Apple App Review Guideline 3.1.3(e), not an in-app digital purchase.

### US-04.2 Chinese User — WeChat QR Payment
> As a Chinese-speaking user, I want to scan a WeChat QR code to complete payment, so that I can pay using a method I'm familiar with.

**Acceptance Criteria**
- Given the user selects "WeChat Payment", When they reach the payment page, Then the system displays the business's personal WeChat QR code along with the amount and a reference note (for manual reconciliation)
- Given the user completes the WeChat transfer, When they tap "I've Paid", Then the Booking status changes to "Pending Manual Verification" and the business is notified to reconcile the payment
- Given the business confirms receipt in the admin panel, When they mark it as verified, Then the Booking status updates to "Paid" and the user is notified

> Note: The personal WeChat QR code is not an official merchant API and cannot auto-confirm receipt via callback, hence the "manual verification" flow. This is a key difference from the Stripe path and must be clearly documented in `03_System_Architecture.md`.

*Already implemented: `POST /payments/wechat/:bookingId` returns the business's static QR code image (`Business.wechatQrCodeUrl`, settable by the owner via `PATCH /businesses/me` — see US-04.5, added 2026-07-31, for the image-picker UI this now has) plus a generated reference note; `PATCH /payments/:id/mark-paid` (customer) moves it to `pending_verification`; `PATCH /payments/:id/verify` (owner/admin only) confirms it as `paid`. `initiateWechat` was made idempotent on 2026-07-27 (reuses an existing pending/pending_verification payment for the same booking instead of creating a duplicate row every time the payment screen is reopened). Wired into the app: `BookingDetailScreen` shows a tappable payment-status row for the customer (routes to `PaymentScreen`), which displays the QR code, amount and reference note, and drives the "I've Paid" action. As of 2026-07-27, the owner's side is also wired up: a new `GET /payments/business` lists every payment for the business (customer name, amount, reference, status), surfaced in `PaymentVerificationScreen` (reachable from `ProfileScreen`'s "Verify Payments" quick action, owner/admin only), with pending-verification entries sorted first and a one-tap "Verify" action calling `PATCH /payments/:id/verify`. "Notify the business to reconcile" (previously unimplemented) is now covered by Module 5 — see US-05.2.*

### US-04.3 View Payment History
> As a logged-in user, I want to view my payment history, so that I can reconcile my bills.

**Acceptance Criteria**
- Given the user opens "Billing / Payment History", When the page loads, Then it displays the payment method, amount, status and time for each booking

*Already implemented: `GET /payments/mine` (now also joining the booking's service name, for a readable list) is wired into a new `PaymentHistoryScreen` (reachable from `ProfileScreen`'s "Payment History" quick action), listing method, amount, status and date per payment.*

### US-04.4 Business Owner Refunds a Payment (added 2026-07-31)
> As a Business Owner, I want to refund a customer's payment when a booking doesn't go ahead, so that I'm not stuck reconciling a charge outside the app with no record of it.

**Acceptance Criteria**
- Given a `paid` payment, When the owner refunds it with a reason, Then the payment moves to "Refunded", the reason is recorded, and the customer is notified
- Given the payment was via Stripe, When the refund is confirmed, Then the underlying Stripe charge is actually refunded through the Stripe API, not just marked refunded locally; pending/ambiguous provider results remain `refund_pending` and can be reconciled safely by an owner/admin
- Given the payment was via WeChat, When the owner refunds it, Then the system records the refund (the owner has already returned the money manually outside the app — same trust model as WeChat payment verification)
- Given a payment is not currently `paid` (already refunded, still pending, etc.), When a refund is attempted, Then the system rejects it
- Out of scope for Version 1: partial-amount refunds (full refund only), and any automatic link between refunding a payment and cancelling its booking — those are two separate owner actions

*Already implemented: `PATCH /payments/:id/refund` (owner/admin only, `reason` required) — see `03_System_Architecture.md` §6.3 for the claim-before-calling-Stripe ordering and the rollback behavior if the Stripe API call fails. Wired into `PaymentVerificationScreen` as a "Refund" button on `paid` payments, expanding into an inline reason field plus confirm/cancel.*

### US-04.5 Business Owner Manages Business Settings (added 2026-07-31)
> As a Business Owner, I want to set my business's name, contact/location info, and WeChat payment QR code myself, so that initial setup and later changes don't require someone to edit the database directly.

**Acceptance Criteria**
- Given the owner opens "Business Settings", When the page loads, Then it shows the business's current name, region/contact info, and WeChat QR code (if set)
- Given the owner edits the name, region, or uploads a new QR code image, When they save, Then the changes take effect immediately — including for `US-04.2`'s WeChat payment flow, which reads the QR code from the same field

*Already implemented: `GET /businesses/me` plus `PATCH /businesses/me` for name, region and WeChat QR. `BusinessSettingsScreen` uploads the QR image through the shared S3-compatible presigned upload flow.*

### Payment Strategy and Future Expansion

Payment methods will keep growing as the market and available technology evolve. Defining the strategy up front avoids reworking the core Booking/Payment state machine every time a new method is added.

| Region / Stage | Payment Method | Implemented in Version 1? |
|---|---|---|
| New Zealand | Stripe (online card) | ✅ Implemented |
| China | WeChat personal QR code + manual verification | ✅ Implemented |
| Future | WeChat official merchant API (automatic callback, replacing manual verification) | ⏳ Planned — see `08_Payment_Design.md` |
| Future | Apple Pay | ⏳ Planned |
| Future | Google Pay | ⏳ Planned |

**Design Principle:** From Version 1 onward, the Payments module is designed to be "pluggable" by payment method (each method maps to a `payment_method` enum value with its own state-transition logic), rather than hard-coding Stripe and WeChat logic together. This means adding the official WeChat API or Apple/Google Pay in the future only requires implementing a new payment method, without refactoring the existing payment flow. The detailed state machine and technical approach will be expanded in `08_Payment_Design.md`.

---

## Module 5: Notifications

> **Future Expansion Note:** Version 1 implements in-app push notifications only. In the future, Push/Email/SMS/WeChat notifications will be unified into a Notification Center, covering all notification sources — bookings, payments, chat, AI, camera, promotions. Detailed design will be in `09_Notification_Design.md`; not expanded here.

### US-05.1 Booking Status Change Notification
> As a logged-in user, I want to receive a push notification when my booking status changes, so that I don't need to proactively check the app.

**Acceptance Criteria**
- Given a user's booking status changes from "Pending" to "Confirmed" (or another key status change), When the status updates, Then the system pushes a notification to the user's device
- Given the user has disabled notification permissions, When the status change occurs, Then the system still records an in-app notification (message center) for the user to view next time they open the app

*Already implemented (2026-07-27): `bookings.service.ts`'s `updateStatus()` and `cancel()` both call a new `NotificationsService.notify()` after the status change, writing an in-app `Notification` row (always) and best-effort pushing to the customer's registered Expo push token (if any). Wired into the app: a bell icon with an unread-count badge on both `HomeScreen` and `BusinessHomeScreen` opens `NotificationsScreen` (`GET /notifications/mine`, tap-to-mark-read via `PATCH /notifications/:id/read`). See the AC's second line, and the important caveat below: the "pushes a notification to the device" half of this AC cannot currently be verified end-to-end in Expo Go — the in-app half can.*

### US-05.2 Payment-Related Notifications
> As a user, I want to be notified when payment succeeds or requires manual verification, so that I understand payment progress.

**Acceptance Criteria**
- Given a WeChat payment enters "Pending Manual Verification" status, When the status changes, Then the user receives a "waiting for business to confirm receipt" notification
- Given the business completes verification, When the status changes to "Paid", Then the user receives a confirmation notification

*Already implemented (2026-07-27), reusing the same `NotificationsService` as US-05.1: `payments.service.ts` notifies the customer on `markWechatPaid` (confirms their "I've Paid" tap registered) and on `verifyWechatPayment` (payment confirmed), and notifies every owner/admin of the business on `markWechatPaid` (the "waiting for business to confirm receipt" half of the first AC, satisfied from the business's side rather than the customer's — this was the specific gap `03_System_Architecture.md` §6.2 had flagged as unimplemented). Stripe's webhook handler also notifies the customer on `checkout.session.completed`/`.expired` (not `payment_intent.succeeded`/`.payment_failed` — those were the event names before US-04.1's Checkout Session rewrite; see `03_System_Architecture.md` §6.1), which goes beyond this US's literal wording but follows the same pattern.*

### Implementation Note: Push Delivery vs. In-App Notifications (2026-07-27)

Both user stories above are split into two independently-working halves:

- **In-app notification record** (`Notification` table, `GET /notifications/mine`, `NotificationsScreen`): fully implemented and testable in Expo Go — this is the half both ACs fall back to.
- **Remote push delivery** (an OS-level notification arriving even when the app isn't open): implemented via `expo-notifications` client-side (permission request + Expo push token registration, `PATCH /notifications/register-device`) and a fire-and-forget call to Expo's push gateway server-side (`src/modules/notifications/expo-push.util.ts`), but **as of Expo SDK 53+, Expo Go no longer supports remote push delivery on either platform** — only a standalone or EAS dev-client build does. `registerForPushNotificationsAsync()` (frontend) is written defensively so this fails silently (no token gets registered, no crash) rather than blocking anything. This mirrors the Stripe frontend decision in US-04.1: leaving Expo Go is a deliberate tradeoff not yet made, so real push delivery is implemented but currently unverifiable in the dev environment in use.

---

## Module 6: Daily Reports

Corresponding backend module: `reports`

### US-06.1 Business Publishes a Daily Report
> As a service provider, I want to upload text and photos for an in-progress booking to record the pet's condition that day, so that the owner can feel confident about their pet's wellbeing.

**Acceptance Criteria**
- Given a booking's status is "In Progress", When the business enters a text description, uploads up to three photos, and submits, Then the system creates a daily report record linked to that booking with a timestamp
- Given an uploaded photo exceeds 5 MB, When submitted, Then the App blocks the upload before requesting an object-storage URL
- Given there are multiple daily reports in one day (e.g. morning and evening), When viewing the report list, Then multiple entries display in chronological order rather than overwriting each other

*Already implemented: `POST /reports/:bookingId` for the assigned staff or business owner/admin, restricted to `in_progress`. `ReportComposeScreen` accepts text and up to three photos, uploads each directly with a five-minute presigned object-storage URL, then submits only HTTPS URLs in `mediaUrls`. DTOs reject inline data URIs.*

### US-06.2 User Views Pet Daily Reports
> As a logged-in user, I want to view daily reports for my pet during a care period, so that I can stay updated on my pet's condition.

**Acceptance Criteria**
- Given the user's pet has an associated in-progress/completed booking, When the user opens that booking's detail page, Then they see all related daily reports (text + media)
- Given that booking has no daily reports yet, When the user views it, Then the system shows "No daily reports yet" rather than an error or blank page

*Already implemented: `GET /reports/:bookingId` (the booking's own customer, assigned staff, or owner/admin), returned in chronological order. Wired into `BookingDetailScreen`'s "Daily Reports" section for those roles, rendering each report's text and photo thumbnails, with a friendly "No daily reports yet" empty state and a refetch-on-focus.*

---

## Cross-Module Non-Functional Requirements (Draft)

> These need to be further refined together with `03_System_Architecture.md`; listed here as items to consider.

| Category | Requirement (draft, to be confirmed) |
|---|---|
| Bilingual Support | Interface text must support Chinese/English switching, without mixed languages |
| Media Storage | V1 daily-report photos use S3-compatible object storage through purpose/role-scoped presigned uploads; video is explicitly deferred beyond V1 |
| Data Privacy | Pet information and payment information require appropriate access control (users can only see their own data) |
| WeChat Payment Verification SLA | Needs agreement with the business on a reasonable average verification turnaround (e.g. within 24 hours) |
| Multi-Tenant Data Isolation | Core business-owned tables (Booking, Service, Payment via Booking, etc.) reserve a `business_id` field; in Version 1 all data belongs to Y&T Paws by default, but query logic should filter by `business_id` rather than hard-coding the assumption of "only one business." Pet is intentionally excluded — it belongs to its owning customer, not a business (see `01_Project_Overview.md` §11) |

### V1 Help Center (non-AI)

Profile provides an in-app bilingual Help Center with keyword search, topic filters and curated answers for booking, payment, pet/report and account questions. It performs no paid AI/API calls and does not take business actions. Unmatched or booking-specific questions route to the existing public support page. The App depends on a `HelpProvider` interface so a future authenticated AI assistant can replace or supplement local search without changing navigation or exposing a provider key in the mobile bundle.

---

## Change Log

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-07-02 | v0.1 | Initial draft covering User Stories and acceptance criteria for the six Version 1 modules | Xiyun Liu |
| 2026-07-02 | v0.2 | Aligned with PetHome/Y\&T Paws two-tier naming; added multi-tenant data isolation requirement | Xiyun Liu |
| 2026-07-02 | v0.3 | Added User Roles section (Customer/Business Owner/Staff/Admin); added Payment Strategy and Future Expansion subsection; added Notification Center future note to the Notifications module; translated to English | Xiyun Liu |
| 2026-07-22 | v0.4 | Decided Staff scope for Version 1: Business Owner creates staff accounts and assigns bookings to them (US-03.5, US-03.6); customers choosing their own staff member is explicitly deferred until staff headcount justifies it | Xiyun Liu |
| 2026-07-22 | v0.5 | Added US-01.4 Business (Owner) Registration: business onboarding is self-service from Version 1 onward (including for Y&T Paws itself), not an admin-provisioned setup step — this is the mechanism that will let the platform be resold to other businesses later without rework | Xiyun Liu |
| 2026-07-26 | v0.6 | Synced implementation status across all six modules: Services/Bookings (US-03.1–03.6) and Pets (US-02.1–02.3) backends are wired into the app; Payments (US-04.1–04.3) and Daily Reports (US-06.1/06.2) are implemented on the backend only, with no frontend screens yet; documented the new `pricingUnit` field on Service and the `PATCH /bookings/:id/status` lifecycle endpoint | Xiyun Liu |
| 2026-07-27 | v0.7 | Synced implementation status again, closing most of the remaining frontend gaps: pet editing and health records (US-02.2/02.3, `PetDetailScreen`), booking cancellation and status history (US-03.3/03.4, `MyBookingsScreen` + `BookingDetailScreen`), business self-registration UI (US-01.4, `RegisterBusinessScreen`), staff account management and booking assignment (US-03.5/03.6, new `StaffManagementScreen` plus assignment chips in `BookingDetailScreen`, backed by a new `GET /auth/staff` endpoint), WeChat payment and payment history (US-04.2/04.3, new `PaymentScreen` + `PaymentHistoryScreen`), and daily report authoring (US-06.1, new `ReportComposeScreen`, using base64-embedded photos as an interim stopgap for missing cloud storage) and viewing (US-06.2, `BookingDetailScreen`). Stripe card payment (US-04.1) remains backend-only and is explicitly deferred pending a decision on native SDK vs. WebView Checkout | Xiyun Liu |
| 2026-07-27 | v0.8 | Closed four more gaps in the same session: Module 5 Notifications (US-05.1/US-05.2) implemented end-to-end for the first time — in-app notification record plus best-effort Expo push, triggered from `bookings`/`payments` — including the previously-flagged-as-missing "notify the business to reconcile" step; owner-side WeChat payment verification (US-04.2) via new `PaymentVerificationScreen`; pet photo upload (US-02.1/02.2) via the same interim base64 approach as daily report photos; and a new role-based `BusinessHomeScreen` dashboard (owner/staff/admin land here instead of the customer `HomeScreen`) — the last one has no PRD user story, added as a UX gap closure. Documented that remote push delivery, while implemented, can't be verified end-to-end in Expo Go on SDK 53+ (dev-client build required, same tradeoff as Stripe) | Xiyun Liu |
| 2026-07-28 | v0.9 | Closed the last remaining V1 gap: Stripe card payment frontend (US-04.1). Resolved the "native SDK vs. WebView Checkout" decision flagged since v0.7 in favor of Stripe Checkout Sessions opened via `expo-web-browser` — no native Stripe SDK, no dev-client build, works inside Expo Go. `initiateStripe`'s backend contract changed from returning a PaymentIntent `clientSecret` to a Checkout Session `checkoutUrl`; the webhook now keys off `checkout.session.completed`/`.expired` instead of `payment_intent.succeeded`/`.payment_failed`. Added `GET /payments/:id` for post-redirect polling. `PaymentScreen` gained a Card/WeChat method selector | Xiyun Liu |
| 2026-07-29 | v0.10 | Corrected the Multi-Tenant Data Isolation NFR row: Pet is deliberately excluded from the `business_id`-carrying tables (see `01_Project_Overview.md` §11), not an oversight; clarified the `admin` role note under Section 2 — current code treats `admin` as a second `owner`-equivalent scoped to the same `businessId` via the `@Roles('owner','admin')` guards, not the cross-business platform-operator role originally described, which remains unbuilt | Xiyun Liu |
| 2026-07-30 | v0.11 | Rewrote US-01.4: business registration is bootstrap-only, not ongoing self-service — `POST /auth/register-business` now rejects once a `Business` row exists. Removed the `RegisterBusinessScreen`/login-screen entry point/API client call as a result, since a customer-facing "Register Business" action could now only ever fail | Xiyun Liu |
| 2026-07-31 | v0.12 | Added US-03.7 (owner service management — `ServiceManagementScreen`, previously API-only), US-04.4 (owner-initiated full refunds via `PATCH /payments/:id/refund`), and US-04.5 (business settings — name/region/WeChat QR, `BusinessSettingsScreen`, `GET /businesses/me` added since there was previously no way to read current values back). Rewrote US-02.1 (Pet creation): progressive profile-building (name only required at creation) is now the *accepted* V1 behavior rather than a gap against a stricter AC that was never actually built | Xiyun Liu |
| 2026-08-01 | v0.13 | Corrected event names in US-05.2's implementation note (`checkout.session.completed`/`.expired`, not the pre-rewrite `payment_intent.succeeded`/`.payment_failed`) and US-06.1's now-outdated "no server-side file-too-large check" line (DTO-level size/shape limits were added 2026-07-31). Added the "V1 never hard-deletes a Service" AC to US-03.7. Backend gained `GET /bookings/:id/care-details` (customer/assigned-staff/owner-admin) so staff caring for a pet can see its full profile — not yet wired into a screen, tracked as follow-up — and `ReportsService`'s read permission was tightened to match write (assigned staff only); see `03_System_Architecture.md` v0.14 for both | Xiyun Liu |
| 2026-08-01 | v0.14 | Added US-01.5/01.6: hashed single-use password reset tokens, password-change session revocation, staff first-password flag and activation controls, last-owner/self-deactivation protection, plus password-confirmed in-app account deletion with explicit anonymization and financial-record retention rules | Xiyun Liu |
| 2026-08-01 | v0.15 | Completed password reset delivery and recovery UX (Resend, App deep link, web fallback), enforced the staff first-password gate in App/API, added persistent login/reset abuse controls and security audit events, published linked privacy/terms/external deletion pages, and replaced new base64 media writes with S3-compatible direct uploads | Xiyun Liu |
| 2026-08-02 | v0.16 | Added production-operability acceptance baseline in code/CI: strict secret/provider validation, Docker packaging, automatic Prisma migration, database readiness and process liveness probes, graceful shutdown and production image build verification | Xiyun Liu |
| 2026-08-02 | v0.17 | Aligned V1 daily reports with the shipped photo-only implementation (maximum three JPEG/PNG/WebP images, 5 MB each; video deferred), removed unfinished social/profile/favorites/coupon surfaces from the review build, and linked Profile support actions to the public support page | Xiyun Liu |
| 2026-08-03 | v0.18 | Added the zero-cost V1 bilingual Help Center: local curated FAQ search and category filtering, with specific/unmatched questions routed to human support; paid AI behavior remains outside V1 | Xiyun Liu |
| 2026-08-04 | v0.19 | Finalized booking capacity/cancellation policy: owner-configurable business, service and staff concurrent limits default to unlimited; per-service overlap covers boarding pet count and grooming slots; customers and owners share a 24-hour cancellation cutoff. Added production alerting and expanded service/pet/report/notification/booking e2e coverage | Xiyun Liu |
| 2026-08-05 | v0.20 | Closed the remaining US-01.3 date-format gap: user-facing dates now re-render with the selected language (`en-NZ` or `zh-CN`) while API/storage values remain ISO timestamps | Xiyun Liu |
| 2026-08-06 | v0.21 | Added regression coverage for operational alerts, stale-refund detection and real HTTP health probes; fixed `AppModule` registration so the documented `/health/live` and `/health/ready` endpoints are now reachable rather than controller-only dead code | Xiyun Liu |
| 2026-08-07 | v0.22 | Made the cancellation contract explicit in the App: the action disappears at the exact 24-hour cutoff, an in-window contact message replaces it, and confirmation warns that cancelling never automatically refunds a paid booking. Added e2e boundaries for unlimited/capped/non-overlapping/released capacity, staff reassignment, exact cutoff and retained payment state | Xiyun Liu |

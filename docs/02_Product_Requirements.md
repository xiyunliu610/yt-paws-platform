# 02 · Product Requirements Document

**Document Status:** Draft v0.5
**Related Document:** `01_Project_Overview.md`
**Last Updated:** 2026-07-02
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
| **Staff** | As a business grows, the Business Owner creates staff accounts under their business and assigns incoming bookings to them to carry out; staff have no business-level admin permissions (e.g. payment verification, account management) | ⏳ Planned for Version 1 — see US-03.5/US-03.6 |
| **System Administrator** | Represents the PetHome platform operator itself (not a business), for cross-business, system-level management, in preparation for future multi-business SaaS (Version 4) | ⏳ Reserved role — not implemented in Version 1 |

**Design Principle:** The `User` table includes a `role` field from Version 1 onward (enum: `customer` / `staff` / `owner` / `admin`), even though Admin has no corresponding functional screens yet — this avoids a future data migration. See `04_Database_Design.md` for detailed field design.

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

### US-01.4 Business (Owner) Registration
> As a pet care business owner (a "sitter"), I want to register my own business on the platform myself, so that I get my own isolated tenant without the platform operator setting anything up for me.

**Acceptance Criteria**
- Given a business owner submits a business name plus their own email/password/name, When they submit, Then the system creates a new `Business` row and a `User` with role `owner` and `businessId` pointing to that business, and returns a JWT token like normal registration
- Given the email is already registered, When they submit, Then the system rejects it with "email already exists" (same rule as US-01.1)
- This is the *only* way a `Business` row and an `owner` user come into existence in Version 1 — there is no separate admin-run setup step, including for Y&T Paws itself. This keeps onboarding identical whether it's the first business or the hundredth, which matters because the platform is intended to be resold to other pet care businesses later (see `01_Project_Overview.md` §5, §11)
- Out of scope for Version 1: business verification/approval workflow, billing/subscription for the business itself

---

## Module 2: Pets

Corresponding backend module: `pets`

### US-02.1 Add Pet Profile
> As a logged-in user, I want to add my pet's information, so that care providers understand my pet's basic situation.

**Acceptance Criteria**
- Given the user taps "Add Pet" in their account, When they fill in name, breed, age, weight, spay/neuter status, personality description and dietary notes and submit, Then the system creates a Pet record linked to the current user
- Given required fields (name, breed) are empty, When the user submits, Then the system blocks submission and highlights the missing fields
- Given the user uploads a pet photo, When the upload succeeds, Then the photo displays on the pet's profile card

### US-02.2 View/Edit Pet Profile
> As a logged-in user, I want to view and edit information for pets I've already added, so that I can keep it up to date.

**Acceptance Criteria**
- Given a user has multiple pet profiles, When they open "My Pets", Then the system displays all pet cards belonging to that user
- Given the user edits a field and saves, When the save succeeds, Then the update takes effect immediately and is used in future bookings

### US-02.3 Health Record Association (PetHealthRecord)
> As a logged-in user, I want to record health-related information for my pet (e.g. vaccinations, medical history), so that care providers can reference it in an emergency.

**Acceptance Criteria**
- Given the user adds a health record on the pet profile page, When submitted, Then the record is linked to that Pet and displayed in chronological order
- Given a pet has no health records, When viewing that pet's profile, Then the system shows "No health records yet" rather than an error

---

## Module 3: Bookings / Services

Corresponding backend modules: `services`, `bookings`

### US-03.1 Browse Service List
> As a user, I want to see the available care service types and prices, so that I can choose a suitable service.

**Acceptance Criteria**
- Given a user opens the "Booking" page, When the page loads, Then the system displays all published services (boarding / drop-in visits, etc.) with name, price and duration
- Given a service is currently unavailable (e.g. delisted), When the list loads, Then that service is hidden or marked "currently unavailable"

### US-03.2 Create a Booking
> As a logged-in user, I want to select a service, my pet, and a date/time range and submit a booking, so that I can arrange care.

**Acceptance Criteria**
- Given the user selects a service, pet, and start/end dates, When they submit the booking, Then the system creates a Booking record with status "Pending Confirmation"
- Given the user has no pet profiles, When they attempt to create a booking, Then the system prompts "Please add a pet first" and guides them to do so
- Given the selected time slot conflicts with an existing booking (e.g. the business's capacity is full), When submitted, Then the system flags the conflict and blocks creation

### US-03.3 View Booking Status
> As a logged-in user, I want to view my booking history and current status, so that I understand the progress of my service.

**Acceptance Criteria**
- Given a user opens "My Bookings", When the page loads, Then bookings are shown in reverse chronological order with status (pending / confirmed / in progress / completed / cancelled)
- Given a booking's status changes (e.g. the business confirms it), When the status updates, Then the user sees the latest status in real time or on next app open

### US-03.4 Cancel a Booking
> As a logged-in user, I want to cancel a booking within the allowed time window, so that I can respond to schedule changes.

**Acceptance Criteria**
- Given a booking's status is "Pending Confirmation" or "Confirmed" within the cancellation policy window, When the user taps cancel, Then the system updates the status to "Cancelled" and releases the time slot
- Given a booking has passed the non-cancellable time window (exact rule to be confirmed with the business), When the user attempts to cancel, Then the system shows that cancellation is not allowed and why

### US-03.5 Business Owner Creates a Staff Account
> As a Business Owner, I want to create an account for a staff member under my business, so that I can start assigning them bookings.

**Acceptance Criteria**
- Given the Business Owner submits a new staff member's name, email and phone, When they submit, Then the system creates a User with role `staff` and `businessId` set to the owner's business, and returns login credentials for that staff member
- Given the email is already registered, When the owner submits, Then the system rejects it with "email already registered" (same rule as US-01.1)
- Given the requester is not a Business Owner (or Admin) for that business, When they call this action, Then the system returns 403

### US-03.6 Business Owner Assigns a Booking to Staff
> As a Business Owner, I want to assign an incoming booking to one of my staff, so that the right person carries it out.

**Acceptance Criteria**
- Given a booking belongs to the owner's business and a staff member also belongs to that business, When the owner assigns the booking to that staff member, Then `Booking.assignedStaffId` is set and the staff member can see the booking in their own list
- Given the chosen staff member belongs to a different business, When the owner attempts the assignment, Then the system rejects it
- Given a booking is reassigned to a different staff member, When the change is saved, Then only the newly assigned staff member sees it going forward (the previous assignee loses visibility)
- Out of scope for Version 1: customers choosing their own staff member (see User Roles section above)

---

## Module 4: Payments

Corresponding backend module: `payments`

### US-04.1 New Zealand User — Stripe Payment
> As a New Zealand user, I want to pay for my booking online via Stripe, so that I can quickly confirm my booking.

**Acceptance Criteria**
- Given the user has completed booking details, When they choose Stripe payment, enter card details and submit, Then the system charges via Stripe and marks the Booking as "Paid"
- Given the Stripe payment fails (e.g. card declined), When the failure result is returned, Then the system shows the failure reason, the Booking remains "Pending Payment", and retry is allowed

### US-04.2 Chinese User — WeChat QR Payment
> As a Chinese-speaking user, I want to scan a WeChat QR code to complete payment, so that I can pay using a method I'm familiar with.

**Acceptance Criteria**
- Given the user selects "WeChat Payment", When they reach the payment page, Then the system displays the business's personal WeChat QR code along with the amount and a reference note (for manual reconciliation)
- Given the user completes the WeChat transfer, When they tap "I've Paid", Then the Booking status changes to "Pending Manual Verification" and the business is notified to reconcile the payment
- Given the business confirms receipt in the admin panel, When they mark it as verified, Then the Booking status updates to "Paid" and the user is notified

> Note: The personal WeChat QR code is not an official merchant API and cannot auto-confirm receipt via callback, hence the "manual verification" flow. This is a key difference from the Stripe path and must be clearly documented in `03_System_Architecture.md`.

### US-04.3 View Payment History
> As a logged-in user, I want to view my payment history, so that I can reconcile my bills.

**Acceptance Criteria**
- Given the user opens "Billing / Payment History", When the page loads, Then it displays the payment method, amount, status and time for each booking

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

### US-05.2 Payment-Related Notifications
> As a user, I want to be notified when payment succeeds or requires manual verification, so that I understand payment progress.

**Acceptance Criteria**
- Given a WeChat payment enters "Pending Manual Verification" status, When the status changes, Then the user receives a "waiting for business to confirm receipt" notification
- Given the business completes verification, When the status changes to "Paid", Then the user receives a confirmation notification

---

## Module 6: Daily Reports

Corresponding backend module: `reports`

### US-06.1 Business Publishes a Daily Report
> As a service provider, I want to upload text, photos and video for an in-progress booking to record the pet's condition that day, so that the owner can feel confident about their pet's wellbeing.

**Acceptance Criteria**
- Given a booking's status is "In Progress", When the business enters a text description, uploads photos/video, and submits, Then the system creates a daily report record linked to that booking with a timestamp
- Given an uploaded photo/video exceeds the system's allowed file size, When submitted, Then the system shows a "file too large" message and blocks the upload
- Given there are multiple daily reports in one day (e.g. morning and evening), When viewing the report list, Then multiple entries display in chronological order rather than overwriting each other

### US-06.2 User Views Pet Daily Reports
> As a logged-in user, I want to view daily reports for my pet during a care period, so that I can stay updated on my pet's condition.

**Acceptance Criteria**
- Given the user's pet has an associated in-progress/completed booking, When the user opens that booking's detail page, Then they see all related daily reports (text + media)
- Given that booking has no daily reports yet, When the user views it, Then the system shows "No daily reports yet" rather than an error or blank page

---

## Cross-Module Non-Functional Requirements (Draft)

> These need to be further refined together with `03_System_Architecture.md`; listed here as items to consider.

| Category | Requirement (draft, to be confirmed) |
|---|---|
| Bilingual Support | Interface text must support Chinese/English switching, without mixed languages |
| Media Storage | Daily report photos/videos need a storage solution (local/cloud, to be determined in the Architecture document) |
| Data Privacy | Pet information and payment information require appropriate access control (users can only see their own data) |
| WeChat Payment Verification SLA | Needs agreement with the business on a reasonable average verification turnaround (e.g. within 24 hours) |
| Multi-Tenant Data Isolation | Core tables (Booking, Pet, Service, Payment, etc.) reserve a `business_id` field; in Version 1 all data belongs to Y&T Paws by default, but query logic should filter by `business_id` rather than hard-coding the assumption of "only one business" |

---

## Change Log

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-07-02 | v0.1 | Initial draft covering User Stories and acceptance criteria for the six Version 1 modules | Xiyun Liu |
| 2026-07-02 | v0.2 | Aligned with PetHome/Y\&T Paws two-tier naming; added multi-tenant data isolation requirement | Xiyun Liu |
| 2026-07-02 | v0.3 | Added User Roles section (Customer/Business Owner/Staff/Admin); added Payment Strategy and Future Expansion subsection; added Notification Center future note to the Notifications module; translated to English | Xiyun Liu |
| 2026-07-22 | v0.4 | Decided Staff scope for Version 1: Business Owner creates staff accounts and assigns bookings to them (US-03.5, US-03.6); customers choosing their own staff member is explicitly deferred until staff headcount justifies it | Xiyun Liu |
| 2026-07-22 | v0.5 | Added US-01.4 Business (Owner) Registration: business onboarding is self-service from Version 1 onward (including for Y&T Paws itself), not an admin-provisioned setup step — this is the mechanism that will let the platform be resold to other businesses later without rework | Xiyun Liu |

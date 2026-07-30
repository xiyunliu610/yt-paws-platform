# 01 · Project Overview

**Document Status:** Draft v0.5
**Last Updated:** 2026-07-26
**Maintainer:** Xiyun Liu (Product Owner & Developer)

---

## 1. Project Introduction

**PetHome** is a commercial pet care management platform designed to digitize the daily operations of independent pet care businesses.

The first deployment of PetHome is for **Y&T Paws**, a real pet boarding and pet sitting business located in **Remuera, Auckland, New Zealand**. The platform is intended to replace manual workflows such as phone calls, WeChat messages, spreadsheets and handwritten notes with a unified mobile application and management system.

PetHome is designed as a long-term software product that will continue evolving alongside the business. Every architectural decision, technology choice and documentation standard aims to support sustainable development over the next 5–10 years.

Although the initial deployment is dedicated to Y&T Paws, the system architecture is designed with future extensibility in mind should the product eventually support multiple businesses (see Section 11, "Scope Boundary and Architecture Principles", and the future `03_System_Architecture.md`).

> **Naming Convention:** Throughout this documentation, **PetHome** refers to the platform product itself; **Y&T Paws** refers to the first business onboarded to the platform. These are distinct concepts and must remain clearly distinguished across all documents.

> **Project Positioning Statement:** PetHome is developed as a production-ready commercial software system. Every design decision prioritizes long-term maintainability, scalability, and real-world business operation over academic demonstration.

---

## 2. Business Background

Y&T Paws currently provides pet care services around Remuera and nearby Auckland suburbs.

**Current services:**
- Pet Boarding
- Drop-in Visits
- Pet Daycare
- Pet Grooming (future)

**Current customer base:**
- Approximately 10–50 active customers
- Growing through referrals and local communities

**Current operations rely heavily on manual communication through:**
- WeChat
- WhatsApp
- Phone calls
- SMS
- Manual payment confirmation
- Manual daily updates

As the customer base grows, this workflow becomes increasingly difficult to manage efficiently. The goal of PetHome is to centralize all business operations into a single platform.

---

## 3. Business Challenges

### 3.1 Appointment Management
Appointments are currently managed manually across multiple communication channels. This creates risks including:
- Double bookings
- Missed appointments
- Difficulty tracking booking history

### 3.2 Payment Management
Customers use different payment methods depending on their background. New Zealand customers generally prefer online card payments, while Chinese customers usually prefer WeChat payment. Managing two completely different payment workflows manually increases operational complexity.

### 3.3 Customer Communication
Daily pet updates are currently sent manually through chat applications. Preparing photos, videos and written reports for every customer requires significant time and effort. The process is difficult to standardize and becomes less scalable as customer numbers increase.

### 3.4 Customer & Pet Records
Pet information is currently scattered across conversations. Historical information such as feeding preferences, personality, vaccination notes and previous boarding history is difficult to retrieve consistently.

---

## 4. Target Users

PetHome currently serves one business (Y&T Paws), covering two customer groups.

### 4.1 Local New Zealand Customers
- English interface
- Online booking
- Stripe payment
- Standard digital experience

### 4.2 Chinese-speaking Customers
- Chinese interface
- WeChat QR payment
- Frequent communication
- Higher expectation for daily updates

Both customer groups share the same booking system, pet records and daily reports, differing only in language and payment method.

---

## 5. Product Positioning

PetHome is **not** designed as a marketplace like Rover or Pawshake.

Instead, it is a business management platform built specifically for independent pet care providers. The first business using the platform is Y&T Paws. Future versions may support additional businesses without changing the overall system architecture.

---

## 6. Competitive Landscape

| Product / Approach | Characteristics | Difference from PetHome |
|---|---|---|
| Rover / Pawshake (mainstream overseas platforms) | English-market marketplace connecting multiple sitters, mature third-party escrow payment and review systems | No WeChat payment support; PetHome manages a single business's own operations rather than brokering between multiple sitters |
| WeChat mini-program pet services | Familiar to Chinese users, native WeChat payment support | Typically serves only the Chinese market with weak English support |
| Manual / WeChat groups + transfers (current state) | Flexible, no development cost | Cannot scale, information is not traceable, manual labor cost grows linearly with customer count |

---

## 7. Product Vision

### Short-term — Version 1 (Current Development Target)
Replace manual workflows with a reliable digital platform. Core features: booking, payment, pet profiles, daily reports, customer management.

### Mid-term — Version 1.5 / Version 2
Improve customer experience through intelligence and real-time capability: AI daily report generation, AI customer assistant, live camera access, push notifications, private chat.

### Long-term — Version 3 / Version 4
Expand PetHome into a comprehensive pet care platform: pet store, membership system, loyalty points and coupons, business analytics, AI operations assistant, multi-business support, open APIs (SaaS).

> Long-term plans represent future possibilities rather than committed deliverables.

---

## 8. Core Value Proposition

- **Unified Customer Experience:** One application supporting both English and Chinese users
- **Business Efficiency:** Reduce manual communication and repetitive administrative work
- **Better Customer Trust:** Transparent booking status, daily reports, and future live camera access
- **AI-Assisted Operations:** Use AI to improve communication and operational efficiency rather than replacing human care
- **Scalable Architecture:** A software foundation that supports future business growth without requiring major architectural redesign

---

## 9. Non-Functional Goals

| Category | Goal |
|---|---|
| Performance | Average API response time < 500ms |
| Availability | 99.9% service uptime target |
| Scalability | Support thousands of users without redesign; data model reserves multi-tenant (multi-business) extensibility |
| Security | HTTPS, JWT authentication, encrypted password storage, role-based access control |
| Maintainability | Modular architecture, comprehensive documentation, consistent coding standards |
| Internationalization | Chinese and English language support |

---

## 10. Scope

### Version 1 (Current)
User registration, login, pet profiles, booking, Stripe payment, WeChat QR payment, daily reports, push notifications, admin dashboard

### Version 1.5 (Planned)
AI daily report generation, AI customer assistant, private chat

### Version 2 (Planned)
Live camera, camera authorization, remote viewing, enhanced push notifications

### Version 3 (Planned)
Pet store, inventory management, membership, loyalty points, coupons

### Version 4 (Planned)
Multi-business support, AI business analytics, AI Vision, open APIs

---

## 11. Scope Boundary and Architecture Principles (Important)

- **Multi-tenant extensibility is reflected in the data model starting from Version 1:** core business-owned tables (Booking, Service) reserve a `business_id` field, so that even though only Y&T Paws currently uses the platform, onboarding future businesses will not require a destructive schema migration. **Pet is deliberately not one of these tables** — a pet profile belongs to its owner (a platform customer), not to a business, so it has no `business_id` and can be booked with any business. The Cross-Module NFR table in `02_Product_Requirements.md` is still draft and should be updated to match this rather than listing Pet alongside Booking/Service/Payment
- **Version 1's business logic and permission scope still serve Y&T Paws exclusively.** Multi-business capability is a "reserved structure," not a "fully implemented multi-business operation" (e.g. business-level dashboard switching or full cross-business data isolation belongs to Version 4)
- **Business onboarding is bootstrap-only, not an ongoing self-service surface (decided 2026-07-30, reversing the original plan below).** `POST /auth/register-business` (US-01.4 in `02_Product_Requirements.md`) can only ever create the platform's one `Business` row — `AuthService.registerBusiness` rejects the call once a `Business` already exists. The original design let anyone self-register a new tenant at any time; in practice this meant a customer's service list (which has no `businessId` filter — see `03_System_Architecture.md` §4.2) would start mixing services from every registered business, which is exactly the marketplace behavior this section says PetHome is not. V1 genuinely serves only Y&T Paws, so the registration surface now enforces that instead of just reserving the data model for it. A real multi-business platform (customer-facing business discovery/selection, per-business verification, actual data isolation) is Version 4 scope, done properly then — not something to half-build now via an onboarding form nobody else can safely use yet
- Detailed table structures will be defined in `04_Database_Design.md`

---

## 12. Success Metrics

**Business Metrics**
- Customer adoption rate
- Booking completion rate
- Payment success rate
- Customer retention
- Daily report completion rate

**Technical Metrics**
- API response time
- System uptime
- Crash rate
- AI response time
- Deployment success rate

> The above are draft metrics; actual baselines should be captured after the Version 1 launch.

---

## 13. Design Principles

- Mobile First
- API First
- AI Assisted (not AI Replaced)
- Simplicity Before Complexity
- Documentation Driven Development
- Security by Design
- Scalability by Default

---

## 14. Assumptions

The following assumptions underlie all current design decisions. If any assumption no longer holds in the future, related documents should be re-evaluated:

| Assumption | Description |
|---|---|
| One Business | During Version 1–3, the platform serves only Y&T Paws; multi-business capability is reserved at the data-structure level only, not fully implemented |
| NZ + CN | The user base covers only local New Zealand and Chinese-speaking users; other languages/regions are out of scope for now |
| Internet Required | The platform does not support offline availability; all core features assume the user's device is online |
| Mobile Only | Version 1 does not provide a web client, only iOS/Android mobile apps; whether the Admin Dashboard needs a web client will be evaluated separately |
| Single Currency (NZD) | Multi-currency settlement is not currently considered; both Stripe and WeChat payments are priced in New Zealand dollars |

---

## 15. Documentation Map

PetHome follows Documentation Driven Development, completed one document at a time rather than all at once:

| No. | Document | Status |
|---|---|---|
| 01 | Project Overview | ✅ Completed (this document) |
| 02 | Product Requirements | ✅ Completed |
| 03 | System Architecture | ✅ Completed |
| 04 | Database Design | ⏳ Not started |
| 05 | API Design | ⏳ Not started |
| 06 | AI Agent Design | ⏳ Not started |
| 07 | Camera System Design | ⏳ Not started |
| 08 | Payment Design | ⏳ Not started |
| 09 | Notification Design | ⏳ Not started |
| 10 | Deployment | ⏳ Not started |
| 11 | Security | ⏳ Not started |
| 12 | UI Design | ⏳ Not started |
| 13 | Testing | ⏳ Not started |
| 14 | Roadmap | ⏳ Not started |
| 15 | Development Handbook | ⏳ Not started |

> Update this table's status as each document is completed to keep the documentation map traceable.

---

## Change Log

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-07-02 | v0.1 | Initial draft | Xiyun Liu |
| 2026-07-02 | v0.2 | Adopted PetHome/Y\&T Paws two-tier naming; confirmed multi-tenant extensibility direction; integrated content from uploaded project_overview.docx; added business challenges, design principles, concrete NFR targets, and the full Version 1–4 roadmap | Xiyun Liu |
| 2026-07-02 | v0.3 | Added project positioning statement (commercial-grade standard, not an academic demo); added Assumptions section; added the 15-document documentation map; translated to English | Xiyun Liu |
| 2026-07-22 | v0.4 | Clarified in Section 11 that business onboarding is self-service from Version 1 onward (not admin-provisioned), since the platform is intended to be resold to other pet care businesses later | Xiyun Liu |
| 2026-07-26 | v0.5 | Corrected the Documentation Map: `03_System_Architecture.md` had reached v0.5 but was still listed as "Not started" | Xiyun Liu |

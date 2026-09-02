# Y&T Paws Platform — Roadmap

**Version:** 1.1
**Updated:** 2026-08-11
**Status:** Draft — sequencing confirmed by the maintainer; specific calendar dates not yet set.

This document adds **sequencing and priority** on top of the phases already defined in `01_Project_Overview.md` §7 (Product Vision) and §10 (Scope). It does not restate what each phase contains — see those sections for feature lists. What follows is *when* and *in what order*, including one deliberate reordering versus the original V1→V4 sketch.

## 1. Current status

V1 feature development, all 13 completed design documents, and the CI quality gates in `13_Testing_Strategy.md` are done. What remains before a public launch is entirely external provisioning and verification — the release-evidence variables already enumerated in `.github/workflows/release-readiness.yml` and `13_Testing_Strategy.md` §6:

- Live Stripe account
- WeChat merchant account
- Verified Resend sending domain
- Provisioned S3/R2 bucket
- Apple/Google push credentials tested on physical devices
- Security review sign-off
- Backup/restore and rollback drill evidence

**Decision: public launch is not being rushed.** The maintainer is currently running V1 through internal testing. Closing the external-provisioning list above is explicitly deferred to the V2/V3 timeframe (§4) rather than blocking further feature work now — V1.5/V2 development starts as soon as internal testing is done, in parallel with (not blocked on) launch provisioning.

## 2. Sequencing

```
V1 internal testing (current)
        │
        ▼
V1.5 — in priority order:
  1. AI daily report generation
  2. AI customer assistant
  3. Private chat
        │
        ▼
V2 — remaining scope (enhanced push notifications, etc.)
  Camera is deliberately NOT scheduled here — see §3
        │
        ▼
Launch provisioning revisited (§1 evidence list) around this point
        │
        ▼
Camera system + Pet store / e-commerce — done last (§3)
        │
        ▼
V4 scope (multi-business, AI analytics, open APIs) — placement
relative to Camera/e-commerce is not yet decided (§5)
```

## 3. Deliberate reordering: Camera and e-commerce move to last

`01_Project_Overview.md` §10 originally sequenced Camera as V2 and Pet Store/e-commerce as V3, ahead of V4. **The maintainer has moved both to the end of the roadmap, after the AI/communication features in §2.** Rationale as given: those two are the largest net-new subsystems (Camera already carries a "roadmap intent only, no schema yet" caveat in `01_Project_Overview.md` §11; e-commerce implies inventory, payments-adjacent flows and membership/loyalty logic) and deliver less immediate value to Y&T Paws' actual daily operations than the AI-assisted reporting/communication features do. This is a live decision recorded here, not the original doc 01 sketch — if `01_Project_Overview.md` §10 is read on its own it will look out of date on this point until it's reconciled (see §6).

## 4. Launch provisioning track

The external-provisioning checklist in §1 runs on its own track, revisited once V2-scope feature work is underway (see the pipeline in §2) rather than immediately. Nothing in V1.5/V2 development depends on it; it only blocks `release-readiness.yml`'s `workflow_dispatch` gate, which nobody is dispatching yet.

## 5. Open questions

- No calendar dates are attached to any phase above yet — this doc sequences by dependency/condition ("starts after X finishes"), not by month/quarter. Add dates here once there's a real target.
- Where Camera + e-commerce land relative to V4 (multi-business, AI business analytics, AI Vision, open APIs) is not decided. V4's multi-business work is architecturally heavier than a feature addition — see `01_Project_Overview.md` §11 on what it actually requires (removing the singleton constraint, cross-tenant isolation, a new authorization model) — so it may end up sequenced independently of the Camera/e-commerce pairing rather than strictly after it.
- Per-phase "done" criteria (what makes V1.5 shippable vs. still in progress) aren't defined yet.

## 6. Reconciliation note

Done (2026-08-11, doc 01 v0.24): `01_Project_Overview.md` §7 and §10 now both note that Camera and Pet Store/e-commerce are sequenced last rather than in version-number order, and point back to this document as the authoritative sequencing source. The version-number scope buckets (1.5/2/3/4) in doc 01 are unchanged — they still describe *what* belongs to each version, not *when* it gets built.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-11 | 1.0 | Initial draft from maintainer dictation: V1 launch deliberately deferred past internal testing, V1.5 priority order (AI daily reports → AI assistant → private chat), and Camera + e-commerce moved to last priority ahead of V4 placement, which remains undecided |
| 2026-08-11 | 1.1 | Reconciled §6: `01_Project_Overview.md` §7/§10 updated in place (v0.24) to point back here for sequencing, closing the gap this doc originally flagged |

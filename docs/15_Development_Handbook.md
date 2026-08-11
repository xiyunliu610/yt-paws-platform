# Y&T Paws Platform — Development Handbook

**Version:** 1.0
**Updated:** 2026-08-11
**Status:** Draft — reflects the repository as implemented; expand as workflows change.

## 1. Repository layout

```
yt-paws-platform/
├── yt-paws-backend/   NestJS API (TypeScript, Prisma, PostgreSQL)
├── yt-paws-app/       Expo / React Native app (iOS, Android)
└── docs/              Documentation Driven Development set (01–15)
```

The two apps are independent npm projects with their own `package.json`, `node_modules` and CI steps. There is no root-level workspace config; always `cd` into the relevant project before running its scripts.

## 2. Prerequisites

- Node.js 22 (matches `.github/workflows/ci.yml`)
- PostgreSQL 16 running locally (`brew install postgresql@16` on macOS), or any reachable Postgres instance
- Xcode (iOS Simulator) and/or Android Studio (emulator) if you want a simulator instead of a physical device — neither is required, see §4.2
- Expo Go app on a physical phone is the fastest way to run the mobile app with no native toolchain installed at all

## 3. First-time setup

```bash
git clone <repo> && cd yt-paws-platform

# Backend
cd yt-paws-backend
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET at minimum for local dev
createdb ytpaws              # or whatever database name your DATABASE_URL points at
npx prisma migrate deploy    # apply all existing migrations
npm run start:dev            # NestJS on :3000, watch mode

# App (separate terminal)
cd yt-paws-app
npm install
npm start                    # Expo dev server on :8081
```

The app derives the backend URL automatically from the host Metro was reached on (`resolveDevHost()` in `src/api/client.ts`) — you do not need to set `EXPO_PUBLIC_API_URL` for local development. It's only required for EAS preview/production builds, where there is no Metro dev server to infer a host from.

## 4. Running the app against the local backend

### 4.1 Same-WiFi LAN (default)

`npm start` in `yt-paws-app` prints a QR code and a `exp://<lan-ip>:8081` URL. Scan it with Expo Go on a phone **on the same WiFi** as your dev machine — this is the normal path and keeps both the JS bundle and the backend API on the same reachable host.

### 4.2 Tunnel mode — know the limitation

`npx expo start --tunnel` (installs `@expo/ngrok` on first use) routes the Metro bundle through a public `exp.direct` hostname, which is useful when the phone and dev machine can't reach each other directly (for example, campus/enterprise WiFi with client isolation). **This only tunnels port 8081** — `resolveDevHost()` will resolve to the tunnel hostname, and the app will then try to reach the backend at `https://<tunnel-host>:3000`, which is not proxied and will fail with `Network request failed`. If you must use tunnel mode, also tunnel the backend port separately and set `EXPO_PUBLIC_API_URL` to that second tunnel's URL before starting Metro.

### 4.3 No iOS Simulator / Android emulator on this machine

`npm run ios` needs a full Xcode install (not just Command Line Tools — check with `xcode-select -p`; `/Library/Developer/CommandLineTools` means no Simulator). `npm run android` needs an AVD created in Android Studio (`~/Library/Android/sdk/emulator/emulator -list-avds` to check what exists). Expo Go on a physical device (§4.1) has no such dependency and is the recommended default.

## 5. Environment variables

`yt-paws-backend/.env.example` is the source of truth for every variable the backend reads. For local development you generally only need `DATABASE_URL` and `JWT_SECRET` — everything else (Stripe, Resend, S3/R2, alert webhook) has a real, safe no-op or is simply unused until you're testing that specific integration. The full production-required set, and which values fail startup when missing, is documented in `10_Deployment.md` §5 — don't duplicate that list here, go there when provisioning a real environment.

## 6. Code style

- **Formatting is automatic, not a style debate.** Backend: ESLint (`eslint.config.mjs`, flat config, `typescript-eslint` recommended-type-checked + `eslint-plugin-prettier`) — run `npm run lint` to fix in place. There is no separate app-side linter configured; keep `npx tsc --noEmit` clean instead.
- **TypeScript everywhere**, strict enough that CI's `tsc --noEmit` is a hard gate on both projects.
- **Comments explain *why*, not *what*.** Look at any existing file before adding a comment — the convention in this codebase is short comments only where a decision is non-obvious (a prior incident, a platform limitation, a deliberate trade-off), never restating what the following line already says.
- **No dead scaffolding.** Don't leave commented-out code, unused styles, or speculative abstractions for features that don't exist yet.

## 7. Testing

| Command | Where | What |
|---|---|---|
| `npm test` | `yt-paws-backend` | Jest unit tests |
| `npm run test:cov` | `yt-paws-backend` | Unit tests with coverage (CI enforces floors — see `13_Testing_Strategy.md` §5) |
| `npm run test:e2e` | `yt-paws-backend` | Real Nest module graph against an isolated PostgreSQL instance |
| `npm test` | `yt-paws-app` | Release-safeguard/policy tests (`node --test scripts/*.test.js`) |
| `npx tsc --noEmit` | either | Type-check without emitting |

Full layer breakdown, coverage policy and what's deliberately *not* covered by mocks (live Stripe/WeChat, real push receipts) live in `13_Testing_Strategy.md` — read that before adding a new test layer rather than inventing a parallel convention.

## 8. Git workflow

- Branches: `main` (release) and `dev` (integration). Confirm current convention with whoever's merging before assuming trunk-based vs PR-per-branch, since this is a small/solo-maintainer repo and the flow may be lighter than the branch names imply.
- Commit messages follow **Conventional Commits** — `feat:`, `fix:`, `docs:`, `chore:`, etc. Look at `git log --oneline` for real examples before writing a new one; the existing history is the style guide.
- CI (`.github/workflows/ci.yml`) runs on every push and every PR — see §9. Don't push straight to `main` if CI would fail; run the relevant `npm run build` / `test` / `tsc --noEmit` locally first.

## 9. CI/CD pipeline

`ci.yml` (runs on every push/PR) in order: install backend deps → `prisma generate` → `prisma migrate deploy` against a throwaway Postgres service container → backend build → **API drift check** (`npm run api:drift`, fails if the OpenAPI spec doesn't match the code) → release-evidence self-test → shell script syntax check → unit tests with coverage → e2e tests → upload coverage artifact → build the production Docker image → app `npm ci` → app `tsc --noEmit` → app policy tests + release-config drift check.

`release-readiness.yml` is manually triggered (`workflow_dispatch`) and gates actual production releases on traceable, dated, non-expired evidence variables (live Stripe/WeChat verification, push device test, security review, backup/rollback drills — see `13_Testing_Strategy.md` §6) before building an immutable, SHA-tagged image. It does not run automatically; someone has to decide a release is ready and dispatch it.

## 10. Database migrations

```bash
cd yt-paws-backend
# after editing prisma/schema.prisma
npx prisma migrate dev --name <short_description>   # local: creates + applies + regenerates client
npx prisma migrate deploy                             # CI/production: applies pending migrations only, no schema diffing
npx prisma migrate status                              # check what's pending without applying anything
```

**Known gotcha — the single-Business invariant.** A migration (`20260808000000_business_singleton`) enforces at the database level that the `Business` table can hold at most one row (see `01_Project_Overview.md` §11 for why: V1 serves only Y&T Paws). If your local dev database has accumulated multiple `Business` rows from earlier testing (common if you've run `POST /auth/register-business` more than once, or seeded test data across sessions), `migrate deploy` will fail with a Postgres raise error, not a Prisma-level one. Run `npm run business:audit` first — it lists every `Business` row with its user/service/booking counts and **never mutates data**, so you can decide which one is canonical before manually deleting the rest. If a migration fails partway through, `npx prisma migrate resolve --rolled-back <migration_name>` clears the failed-migration record so you can retry after fixing the underlying data.

**After a from-scratch reset (no `Business` row at all):** the customer-facing "select a service" list will be empty and the app will look broken, not erroring — `GET /services` correctly returns nothing when there's nothing to return. Recreate one business + its services once, either through the app's owner/admin screens after a manual `register-business` call, or directly:

```bash
curl -X POST http://localhost:3000/auth/register-business \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Y&T Paws","email":"owner@example.com","password":"...","name":"Owner Name","phone":"..."}'
# then POST /services with the returned token for each service you need
```

## 11. Documentation Driven Development

This repo writes docs from *implemented* state, not aspiration — see the tone of any file in `docs/`. Before starting non-trivial work, check whether an existing doc already covers the area (`01_Project_Overview.md` §15 is the map); update the relevant doc's **Change Log** table in the same change that alters the behavior it describes, rather than batching documentation later. A PR that changes behavior without touching the doc that describes it is the thing this convention exists to prevent.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-08-11 | 1.0 | Initial draft: setup, local run modes (including the tunnel/backend-port limitation and simulator prerequisites discovered while testing), code style, testing, git/CI, migration workflow and the single-Business reset gotcha |

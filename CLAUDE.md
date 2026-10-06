# CLAUDE.md — WashBookPro

This file is the authoritative reference for Claude Code in this repository.
Read it at the start of every session, then read `docs/PROJECT_STATE.md`.
Never deviate from the decisions recorded here without Petar's explicit approval.

---

## Project Overview

WashBookPro is a multi-tenant SaaS platform for car wash businesses in Serbia,
serving three user groups:

1. **End consumers (B2C)** — book washes via web or mobile, pay cash or online
2. **Business clients (B2B)** — fleet companies: group bookings, fleet management, monthly invoicing (eFaktura)
3. **Car wash owners (SaaS tenants)** — run their own washes on the platform, pay a monthly subscription

Core capabilities: bookings, subscriptions, ANPR-based anti-theft monitoring,
payments, customer notifications, B2B invoicing.
ANPR (matching entering vehicles to reservations to prevent employee theft) is
the primary product differentiator, not a convenience feature.

---

## Technology Stack

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Backend API    | ASP.NET Core 10 (C#), EF Core, modular monolith              |
| Database       | PostgreSQL 16                                                |
| Frontend web   | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui     |
| Mobile app     | React Native + Expo (skeleton)                               |
| ANPR edge      | Python (PlateRecognizer API)                                 |
| Infrastructure | Docker Compose, pnpm                                         |

Version strategy (ADR-003): always the newest LTS of each framework.
Training data may predate these versions — verify version-specific APIs
against current docs (Context7 if available) instead of relying on memory.

---

## External Services

| Purpose        | Service               | Notes                                    |
| -------------- | --------------------- | ---------------------------------------- |
| SMS / Viber    | Infobip               | NOT Twilio. Deferred.                    |
| Payments       | AllSecure or Monri    | NOT Stripe. Deferred.                    |
| ANPR           | PlateRecognizer       | Phase 2                                  |
| Email          | Resend                | Transactional email                      |
| Object storage | MinIO (S3-compatible) |                                          |

---

## Repository Structure

```
/backend        ASP.NET Core 10 API
/web            Next.js 16 web app
/mobile         React Native + Expo
/anpr-edge      Python ANPR service (Phase 2)
/docs
  /decisions    Architecture Decision Records (ADR)
  /diagrams     Architecture diagrams
/infra          Docker Compose, deployment scripts
```

Do NOT introduce an `apps/` prefix, `packages/` folder, or monorepo tooling
(Turborepo, pnpm workspaces) unless explicitly approved.

---

## Working Model (read carefully)

Claude Code is both planner and implementer. Petar approves every step.

1. **Plan first.** For any non-trivial task, investigate the code and present a
   written plan (files to touch, approach, risks, open questions). Do not edit
   files until Petar explicitly approves the plan.
2. **Gate by gate.** Split work into small gates. After each gate: stop, show
   the full contents of every changed file (not a summary, not only a diff),
   and the verification output. Wait for approval.
3. **Commits.** Never commit without Petar's approval. Conventional Commits
   format, no AI attribution (no "Co-Authored-By", no "Generated with").
4. **No push** to GitHub without explicit approval.
5. **Stop when done.** After finishing the assigned task, stop. Do not start
   the next task unprompted.
6. **Push back.** If a request conflicts with a locked decision below, or an
   assumption looks wrong, say so before implementing. Do not agree mechanically
   and do not adjust findings to match earlier assumptions.
7. **Repeat key values in prose** (IDs, ports, counts, versions), not only
   inside tool output.

---

## Verification Rules

These exist because earlier agent sessions failed in exactly these ways.

- **"Done" requires evidence.** Show the output of the relevant checks:
  `dotnet build`, tests, `pnpm exec tsc --noEmit` (always run explicitly for
  TypeScript changes), and real HTTP responses for endpoint changes.
- **Empirical results beat documentation.** If docs say one thing and the
  running system does another, report the conflict; trust the test.
- **Be precise about status.** An ADR written is not an implementation done.
  Partially complete work must be reported as partial.
- **Unexpected git diff:** understand where it came from before reverting or
  "fixing" anything.
- **Never silence an error detector.** Do not add a comment, suppression, or
  workaround that hides a symptom without fixing the root cause
  (e.g. `SaveChangesAsync` firing before `SpecifyKind`).

---

## Multi-Tenancy

- Shared database, `TenantId` column, EF Core global query filters,
  `ITenantScoped` marker interface.
- Public endpoints: tenant resolved by slug, queries use `IgnoreQueryFilters()`.
- Authorized endpoints: tenant resolved from JWT `tenant_id` claim via `ITenantContext`.

---

## Locked Decisions (do not revisit without approval)

- `CreateReservationAsync` intentionally carries no buffer — the availability
  algorithm is the sole buffer enforcer.
- `JsonStringEnumConverter` is NOT registered — `ReservationCreatedBy` and
  `ReservationStatus` serialize as integers.
- `customer-auth.ts` is only for the booking flow; `auth.ts` only for
  Owner/Worker. No file may import both (ADR-022).
- Styling uses `--wb-*` CSS tokens only, never the Tailwind color scale directly.
- Fetch calls happen at a single point (BookingFlow level via hooks), never
  inside components rendered in both the desktop and mobile trees.
- Design direction "Confident Utility" (ADR-023): off-white `#FAFAF7`, navy
  `#0A0E27`, single accent electric blue `#2563EB`, Figtree + GeistMono,
  no gradients on functional elements, monospace eyebrow labels.
- Serbian dates: use `Intl` (`toLocaleDateString("sr-Latn-RS")`) with explicit
  `timeZone: "Europe/Belgrade"`; genitive/nominative month forms come from the
  custom lookup helper. Do not use `date-fns` `sr-Latn` for month forms.

---

## Known Gotchas

- `FindAsync` ignores `IgnoreQueryFilters()` — always use `FirstOrDefaultAsync`.
- Connection string key is `"Default"`, not `"DefaultConnection"`.
- `ReservationSeed.cs` uses `Guid.NewGuid()` — Service and Bay IDs change after
  every `docker compose down -v`. Never hardcode them; query them.
- Seed backfill must survive `docker compose down -v`.
- After `docker compose up --build -d`, if the Users table is empty, run
  `docker compose restart backend` (without `--build`) to trigger the seed.

---

## Dev Environment

- Docker: run `docker compose up --build -d` from `/infra/`
- Backend: port 8080 (Docker — the canonical setup). Native `dotnet run` on 5033
  is not the real dev workflow; do not use it. Scalar: `http://localhost:8080/scalar/v1`
- Frontend: port 3000 (CORS is hardcoded to it). Package manager: pnpm
- pgAdmin: `http://localhost:5050`
- Dev tenant: slug `dev-wash`, ID `80b059d6-c10f-47a6-8296-797009d5aa3d`
- Dev seed users (local only): `owner@devwash.local / Owner123!`,
  `worker@devwash.local / Worker123!`

---

## Session Continuity

- `CLAUDE.md` = stable rules (this file). Change it only with approval.
- `docs/PROJECT_STATE.md` = current state and next steps. Read it at session start;
  propose an update at the end of every completed gate.
- `/docs/decisions/ADR-NNN-title.md` = significant decisions, written in
  Serbian (Latin script).

---

## Environment Variables

All secrets live in `.env.local` (gitignored).
`.env.example` is the committed template — all entries are commented out.

---

## Development Rules

- **Language:** code, identifiers and CLAUDE.md in English. README files, ADRs
  and other documentation in Serbian (Latin script). Talk to Petar in Serbian.
- **No uncommitted secrets.** `.env*` files (except `.env.example`) are gitignored.
- **No unapproved structural changes.** If a new tool, folder, dependency or
  convention seems useful but is not in the approved plan, stop and ask.

---

## Roadmap Phases (high level)

| Phase | Period     | Description                                                              | Status      |
| ----- | ---------- | ------------------------------------------------------------------------ | ----------- |
| 0.1–0.8 | Week 1-12 | Repo, dev env, backend scaffold, EF Core + multi-tenancy, JWT, web, mobile, Docker/CI | ✓ Done |
| 1     | Month 3-5  | MVP for owner's wash: reservations, worker terminal, owner dashboard     | In progress |
| 2     | Month 6-8  | ANPR anti-theft, B2B portal, notifications, mobile full-featured         |             |
| 3     | Month 9-11 | SaaS readiness: self-service onboarding, online payments, eFaktura, subscription billing |  |
| 4     | Month 12+  | Growth, optimization, advanced features                                  |             |

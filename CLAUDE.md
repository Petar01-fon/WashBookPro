# CLAUDE.md — WashBookPro

This file is the authoritative reference for Claude Code in this repository.
Read it at the start of every session, then read `docs/PROJECT_STATE.md`.
Never deviate from the decisions recorded here without Petar's explicit approval.

---

## Project Overview

WashBookPro is a multi-tenant SaaS platform for car wash businesses in Serbia.

**Strategic focus through 2027 (ADR-029):** a tool for car wash owners —
wash records, workers, bookings and control over cash. The owner pays a
monthly subscription per location. Drivers book through each wash's own
public page (`/book/[slug]`), not through a marketplace.

Long-term the platform may also serve drivers (B2C marketplace) and fleet
companies (B2B, eFaktura). Both are DEFERRED until their triggers in the
development plan are met.

ANPR (matching entering vehicles to recorded washes to prevent employee
theft) is the primary product differentiator, not a convenience feature.

**Single source of truth for planning:** `docs/plan/WashBook-Plan-razvoja.md`
(with `docs/plan/WashBook-Plan-testiranja.md`). If any other document
disagrees with it, the plan wins.

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
| ANPR           | PlateRecognizer       | Phase B2 (passive), C (integration)      |
| Email          | Resend                | Transactional email                      |
| Object storage | MinIO (S3-compatible) |                                          |
| Error tracking | Sentry                | EU region, org `washbook`; errors only, no PII (ADR-030) |

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
- Serbian dates: month names are nominative ("15. jul 2026", not "15. jula").
  Web formats through `web/lib/date-format.ts` (`formatDateSr`, `formatTimeSr`,
  `belgrade*` helpers), which use `Intl` `sr-Latn-RS` with explicit
  `timeZone: "Europe/Belgrade"` for instants. Backend (email) uses the lookup
  table in `Common/Formatting/SerbianDateFormatter.cs`. Do not use `date-fns`
  `sr-Latn` for month forms.

---

## Known Gotchas

- `FindAsync` ignores `IgnoreQueryFilters()` — always use `FirstOrDefaultAsync`.
- Connection string key is `"Default"`, not `"DefaultConnection"`.
- Dev seed IDs are fixed and survive `docker compose down -v`: services in
  `ReservationSeed.cs` (`5e000000-0000-4000-8000-00000000000[1-6]`), Bay 1, owner and worker in
  `DevDataSeed.cs` (see "Dev Environment"). Do not reintroduce `Guid.NewGuid()` in the dev seed.
- Seed backfill must survive `docker compose down -v`.

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
- The dev seed (tenant, owner, worker, Bay 1, services) runs at backend startup in
  Development; `docker compose restart backend` is not needed (ADR-025).
- Fixed dev IDs: Bay 1 `b0000000-0000-4000-8000-000000000001`; service
  "Kombi — obično pranje" `5e000000-0000-4000-8000-000000000005` (useful for curl tests).

---

## Session Continuity

- `CLAUDE.md` = stable rules (this file). Change it only with approval.
- `docs/plan/WashBook-Plan-razvoja.md` = the only valid development plan
  (phases, sprints, scope, gates). Changes only with Petar's decision.
- `docs/PROJECT_STATE.md` = current state and next steps. Read it at session start;
  propose an update at the end of every completed gate.
- `docs/ideje.md` = parking lot for new ideas. A new idea goes there, not
  into code or into the plan; the list is reviewed once a month.
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

## Roadmap Phases (revised Nov 2026)

Strategic focus for 2027: WashBook is a tool for car wash owners
(bookings, worker terminal, owner control over cash). Each wash has a
public booking page (`/book/[slug]`). Driver marketplace, B2B/eFaktura,
online payments, self-service onboarding and the mobile app are DEFERRED.
Do not build deferred features without explicit approval.

| Phase | Period              | Description                                                        |
| ----- | ------------------- | ------------------------------------------------------------------ |
| 0.x   | done                | Foundation (repo, backend, auth, web, mobile skeleton, Docker) ✓   |
| A     | Nov 10 – Dec 31 '26 | Pilot-ready: critical fixes, worker terminal (PIN), owner daily    |
|       |                     | report vs cash, audit log, Sentry/Serilog/Seq, prod + backups      |
| B0    | Jan 4 – 15 '27      | Dry run (simulated work day)                                       |
| B1    | Jan 18 – Feb 7 '27  | Pilot at one location, app only                                    |
| B2    | Feb 8 – Mar 14 '27  | Pilot + passive ANPR camera (logging only, no UI)                  |
| C     | Mar 15 – Apr 30 '27 | ANPR integration: plate-to-wash matching, owner alerts             |
| D     | May – Aug '27       | First customers: 5 active washes, 2–3 paying                       |
| E     | Sep '27+            | Growth; deferred features return only when their trigger is met    |

See `docs/plan/WashBook-Plan-razvoja.md` and `docs/plan/WashBook-Plan-testiranja.md`.

Production domain: `washbook.tech` (`app.` for web, `api.` for API).

---

## Orchestration (multi-agent workflow)

These rules apply only when Petar explicitly starts a sprint or the pilot. Otherwise
work as a normal session under the Working Model rules.

Approved by Petar on 2026-11-12. The main session is the **orchestrator**; the
subagents in `.claude/agents/` do the work. Subagents read this file too: for them only
"Hard stops" and "Never" apply, plus their own agent file.

### Sources of truth

- The only plan is `docs/plan/WashBook-Plan-razvoja.md` (with the testing plan).
  There is no PLAN.md and no STATUS.md.
- Sprint gates and status are kept in `docs/PROJECT_STATE.md` (the "Sprint Xn — plan po
  gate-ovima" table). Every gate needs a concrete verification command. If one is
  missing, propose it, and write it into `PROJECT_STATE.md` only after Petar approves.

### Phase = sprint

- A phase is one sprint (A1, A2, …). A sprint starts only when Petar says so. At sprint
  start the orchestrator presents the gate list (tasks, assigned agent, gate command)
  and waits for approval (Working Model rule 1).
- Inside an approved sprint, this section replaces Working Model rules 2 and 3. The
  orchestrator works gate by gate on its own and does not stop after each gate. It
  stops at the end of the sprint or on a hard stop.

### Branch and commits

- Work on the branch `sprint/<id>` (e.g. `sprint/A1`), created from `main`. Never on `main`.
- After a gate passes, the orchestrator makes exactly one commit, with the message
  `Gate <N>: <short description>` and no AI attribution.
- Subagents never commit. `git push` is forbidden.

### Delegation

- The orchestrator does not write production or test code. It delegates:
  `backend-dev` (`backend/`), `frontend-dev` (`web/`), `tester` (`backend/tests/`),
  and `reviewer` (read-only).
- The orchestrator edits only `docs/PROJECT_STATE.md`.
- Subagents start cold. Each brief is self-contained: goal, gate id, files or areas,
  acceptance criteria, gate command, and constraints from this file.
- Do not run two agents that build the backend (`backend-dev`, `tester`) at the same
  time. `backend-dev` and `frontend-dev` may run in parallel when the task allows it.
- `mobile/` and `anpr-edge/` are off limits to every agent until Petar says otherwise.

### Token economy

- The orchestrator does not read whole files. It relies on subagent reports,
  `git diff --stat` and the gate result files. It reads a targeted line range only to
  settle a reviewer finding or two conflicting reports.
- Subagents report briefly: changed files, what changed (one line each), and the result
  of the build/test commands (exit code, counts). No code dumps.
- Models: the orchestrator runs on opus, `reviewer` on opus, `backend-dev`,
  `frontend-dev` and `tester` on sonnet (set in each agent file).

### Gate loop

1. Delegate the task to the right agent.
2. When the agent stops, the SubagentStop hook (`.claude/hooks/subagent-gate.ps1`) runs
   the gate: `dotnet build` + `dotnet test` for backend changes, `pnpm exec tsc --noEmit`
   for web changes. On failure it sends the agent back, up to 3 attempts. Read the result
   in `.claude/state/gate-<agent>.txt`.
3. Run the gate's own verification command from `PROJECT_STATE.md` if it adds anything
   beyond the hook (e.g. a real HTTP request against `localhost:8080`).
4. Call `reviewer` with the sprint, gate id, task and expected scope.
5. On `PROBLEMI`, delegate the fixes to the same agent type, then review again.
6. The gate passes only when the hook result is `PASS`, the gate command is green and
   the reviewer returns `ODOBRENO`. Then commit (`Gate <N>: …`) and add a short status
   to `PROJECT_STATE.md`: what was done, gate command results, what the reviewer flagged
   and how it was resolved.

### End of sprint

Stop and report to Petar (in Serbian): gates with commit hashes, test counts, reviewer
findings, open issues, and a proposed `PROJECT_STATE.md` update for the next step. Do
not start the next sprint.

### Hard stops (stop mid-sprint, describe the problem, wait for Petar)

- A tenant isolation test fails, or any data leak between tenants is found.
- A change is needed to the plan, an ADR, `CLAUDE.md` or the architecture.
- A migration changes or deletes existing columns or data.
- An existing test would have to be deleted, skipped or weakened.
- The same problem is not solved after 3 attempts (hook result `FAIL-3X`, or the same
  reviewer finding three times).
- A new package is needed (`pnpm add`, `dotnet add package`).
- The gate hook reports `ALERT` or `ENV` (e.g. Docker not running).

### Never

- Delete, skip or weaken tests (looser assertions, wider expected values, swallowed
  exceptions, `Skip =`) to make a gate pass.
- Work around a denied command or a hook in another form (`git -C . push`, `sh -c`,
  scripts). Report it instead.
- Read `.env` files or other secrets, touch the production server or prod compose,
  or delete anything outside the repository.
- Hide a symptom instead of fixing the root cause (see Verification Rules).

### Language

Agent files and code are in English. Reports to Petar are in Serbian.

# CLAUDE.md — WashBookPro

This file is the authoritative reference for Claude Code in this repository.
Read it at the start of every session. Never deviate from the decisions recorded here.

---

## Project Overview

WashBookPro is a multi-tenant SaaS platform for car wash businesses,
serving three distinct user groups:

1. **End consumers (B2C)** — individuals who book car washes
   via mobile app or web, pay cash or online
2. **Business clients (B2B)** — companies managing vehicle fleets,
   with group bookings, fleet management, and monthly invoicing (eFaktura)
3. **Car wash owners (SaaS tenants)** — business owners who operate
   their own car washes on the platform, paying monthly subscription

Core capabilities: bookings, subscriptions, ANPR-based anti-theft
monitoring, payments, customer notifications, and B2B invoicing.

---

## Technology Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Backend API    | ASP.NET Core 10 (C#)         |
| Database       | PostgreSQL                   |
| Frontend web   | Next.js 16 (React 19)        |
| Mobile app     | React Native + Expo          |
| ANPR edge      | Python (PlateRecognizer API) |
| Infrastructure | Docker Compose               |

---

## External Services

| Purpose        | Service               | Notes                                 |
| -------------- | --------------------- | ------------------------------------- |
| SMS / Viber    | Infobip               | NOT Twilio                            |
| Payments       | AllSecure or Monri    | NOT Stripe (B2C market)               |
| ANPR           | PlateRecognizer       |                                       |
| Email          | Resend                | Transactional emails, implemented in Faza 1 (ADR-015) |
| Object storage | MinIO (S3-compatible) |                                       |

---

## Repository Structure

```
/backend        ASP.NET Core 10 API        (initialized Faza 0.3)
/web            Next.js 16 web app         (initialized Faza 0.6)
/mobile         React Native + Expo        (initialized Faza 0.7)
/anpr-edge      Python ANPR service        (initialized Faza 2)
/docs
  /decisions    Architecture Decision Records (ADR)
  /diagrams     Architecture diagrams
/infra          Docker Compose, deployment scripts (Faza 0.8)
```

Do NOT introduce an `apps/` prefix, `packages/` folder, or monorepo tooling
(Turborepo, pnpm workspaces) unless explicitly approved.

---

## Architecture Decisions

ADRs are written in Serbian (Latin script) and stored in `/docs/decisions/`.
Filename format: `ADR-NNN-title.md`

---

## Environment Variables

All secrets live in `.env.local` (gitignored).
`.env.example` is the committed template — all entries are commented out.
Variables are filled in per-phase as noted in `.env.example`.

---

## Development Rules

- **Language:** Code and identifiers in English. CLAUDE.md in English.
  README files and ADRs in Serbian (Latin script).
- **No uncommitted secrets.** `.env*` files (except `.env.example`) are gitignored.
- **No unapproved structural changes.** If a new tool, folder, or convention
  feels useful but was not in the approved plan, stop and ask before adding it.
- **No push to GitHub** without explicit user approval.
- **Phase gates:** Each sub-phase (0.1, 0.2, ...) must be confirmed complete
  before moving to the next.

---

## Roadmap Phases (high level)

| Phase | Period     | Description                                                                              |
| ----- | ---------- | ---------------------------------------------------------------------------------------- |
| 0.1   | Week 1     | Repo setup + documentation foundation ✓                                                  |
| 0.2   | Week 1-2   | Local dev environment: Node.js, PostgreSQL, Docker ✓                                     |
| 0.3   | Week 3-4   | ASP.NET Core 10 backend scaffold with modules ✓                                          |
| 0.4   | Week 5-6   | PostgreSQL + EF Core + multi-tenant foundation ✓                                         |
| 0.5   | Week 7-8   | JWT authentication (register + login + refresh) ✓                                        |
| 0.6   | Week 9     | Next.js 16 web scaffold ✓                                                                |
| 0.7   | Week 10    | React Native + Expo mobile scaffold ✓                                                    |
| 0.8   | Week 11-12 | Docker Compose + CI/CD + deployment ✓                                                    |
| 1     | Month 3-5  | MVP: reservations, worker terminal, owner dashboard ✓                                    |
| 1.1   | -          | Backend: domain model + reservations API + Resend email ✓                                |
| 1.2   | -          | Web: online booking flow (/book/[slug]) ✓                                                |
| 1.3   | -          | Web: worker terminal (/terminal/[slug]) ✓                                                |
| 1.4   | -          | Web: owner dashboard (/dashboard) — stats, bays CRUD ✓                                  |
| 1.5   | -          | Web + backend: services management CRUD ✓                                                |
| 1.6   | -          | Customer auth (B2C) + profile: Google OAuth + email/password, CustomerAccount, /profil ✓ |
| 1.7   | -          | Landing page ("Confident Utility" design) ✓                                              |
| 2     | Month 6-8  | ANPR anti-theft, B2B portal, SMS/Viber notifications, mobile full-featured               |
| 3     | Month 9-11 | SaaS readiness: self-service onboarding, online payments, eFaktura, subscription billing |
| 4     | Month 12+  | Growth, optimization, advanced features                                                  |

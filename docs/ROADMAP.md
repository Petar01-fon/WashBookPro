# Roadmap — WashBookPro

## Faza 0 — Temelji (Nedelja 1–12) · **Završeno**

Postavljanje razvojnog okruženja, scaffold svih aplikacija i deployment pipeline-a.

| Podfaza | Period        | Opis                                                    | Status   |
| ------- | ------------- | ------------------------------------------------------- | -------- |
| 0.1     | Nedelja 1     | Repo setup + dokumentacioni temelj                      | Završeno |
| 0.2     | Nedelja 1-2   | Lokalno razvojno okruženje: Node.js, PostgreSQL, Docker | Završeno |
| 0.3     | Nedelja 3-4   | ASP.NET Core 10 backend scaffold sa modulima            | Završeno |
| 0.4     | Nedelja 5-6   | PostgreSQL + EF Core + multi-tenant temelj              | Završeno |
| 0.5     | Nedelja 7-8   | JWT autentikacija (registracija + login + refresh)      | Završeno |
| 0.6     | Nedelja 9     | Next.js 16 web scaffold                                 | Završeno |
| 0.7     | Nedelja 10    | React Native + Expo mobilni scaffold                    | Završeno |
| 0.8     | Nedelja 11-12 | Docker Compose + CI/CD + deployment                     | Završeno |

### Završene podfaze — detalji

#### Faza 0.1 — Repo setup + dokumentacioni temelj

- Inicijalna struktura repozitorijuma (`/backend`, `/web`, `/mobile`, `/anpr-edge`, `/docs`, `/infra`)
- `README.md` na nivou projekta
- `CLAUDE.md` — instrukcije za Claude Code
- `docs/ARCHITECTURE.md` — pregled arhitekture
- `docs/ROADMAP.md` — ovaj fajl
- `docs/decisions/README.md` — vodič za ADR-ove
- ADR-001: Monorepo struktura
- ADR-002: Tech stack odluka

#### Faza 0.2 — Lokalno razvojno okruženje

- Docker Compose konfiguracija (`infra/docker-compose.yml`)
  - PostgreSQL 16 servis
  - pgAdmin 4 servis sa unapred konfigurisanom konekcijom
- `infra/.env.example` — template za lokalne tajne (gitignored `.env.local`)
- Ispravka dokumentacije: .NET verzija 9 → 10 u svim fajlovima

#### Faza 0.3 — ASP.NET Core 10 backend scaffold

- Solution fajl `backend/WashBookPro.slnx`
- Projekat `WashBookPro.Api` sa modularnom strukturom foldera:
  - `Modules/Auth`, `Modules/Tenants`, `Modules/Reservations`
  - `Modules/Billing`, `Modules/Notifications`, `Modules/Anpr`
  - `Common/Middleware`, `Common/Extensions`
- `Program.cs` sa inicijalnim podešavanjima
- `appsettings.json` i `appsettings.Development.json`
- `launchSettings.json` i `.http` test fajl
- ADR-003: Controller-based vs. Minimal API (odlučeno: Controller-based)

#### Faza 0.4 — PostgreSQL + EF Core + multi-tenant temelj

- NuGet paketi: `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`
- `AppDbContext` sa automatskim `TenantId` filterom (`HasQueryFilter`)
- `ITenantContext` interfejs i `HttpContextTenantContext` implementacija (čita `X-Tenant-Id` header)
- `ITenantScoped` interfejs — marker za multi-tenant entitete
- `Tenant` entitet (`Modules/Tenants/Entities/Tenant.cs`)
- EF Core migracija `InitialCreate` — kreira tabelu `tenants`
- Registracija servisa u `Program.cs` (DbContext + TenantContext)
- ADR-004: EF Core multi-tenant pristup (globalni query filter po `TenantId`)

#### Faza 0.5 — JWT autentikacija

- NuGet paket: `BCrypt.Net-Next` za hashing lozinki
- DTOs: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `RefreshRequest`
- `IAuthService` interfejs i `AuthService` implementacija:
  - Registracija: BCrypt hashing, provera jedinstvenosti email-a po tenantu
  - Login: verifikacija lozinke, izdavanje access + refresh tokena
  - Refresh: rotacija refresh tokena, izdavanje novog access tokena
- `AuthController` sa endpointima `POST /auth/register`, `/auth/login`, `/auth/refresh`
- JWT Bearer autentikacija u `Program.cs` (validacija issuer, audience, lifetime, signing key)
- `IgnoreQueryFilters()` na auth upitima zbog odsustva tenant konteksta pri loginu/registraciji
- `appsettings.Development.json` — dodata `Jwt` sekcija sa PLACEHOLDER vrednostima
- ADR-005: JWT autentikacija

#### Faza 0.6 — Next.js 16 web scaffold

- Next.js 16.2.x sa React 19, TypeScript, Tailwind CSS, shadcn/ui, App Router
- `web/lib/api.ts` — centralni fetch wrapper sa error handlingom (`ApiError`)
- `web/lib/auth.ts` — token management (localStorage), JWT decode, login/logout
- `web/middleware.ts` — zaštita ruta, redirect na `/login` bez tokena
- `app/(auth)/login` — login forma povezana sa `POST /auth/login` na backendu
- `app/(dashboard)` — stub dashboard sa prikazom JWT claimova (userId, tenantId, role)
- CORS konfiguracija u `Program.cs` za development (`DevPolicy`, `localhost:3000`)
- `web/.env.local` — `NEXT_PUBLIC_API_URL` (gitignored)
- ADR-006: Next.js 16 umesto 15, ADR-007: LTS strategija, ADR-008: jedan tenant po korisniku

#### Faza 0.7 — React Native + Expo mobilni scaffold

- Expo SDK sa Expo Router (file-based routing), TypeScript
- `mobile/lib/api.ts` — centralni fetch wrapper sa error handlingom (`ApiError`)
- `mobile/lib/auth.ts` — token management (expo-secure-store), JWT decode, login/logout
- `app/index.tsx` — entry point, redirect na `/login` ili `/dashboard` na osnovu tokena
- `app/login.tsx` — login forma povezana sa `POST /auth/login` na backendu
- `app/dashboard.tsx` — stub dashboard sa prikazom JWT claimova (userId, email, tenantId, role)
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` (gitignored)
- ADR-011: Expo Router umesto React Navigation, ADR-012: expo-secure-store za JWT token storage

#### Faza 0.8 — Docker Compose + CI/CD + deployment

- `backend/Dockerfile` — multi-stage build (sdk → aspnet runtime), linux-x64
- `backend/.dockerignore` — isključuje bin/, obj/, .vs/
- `web/Dockerfile` — multi-stage build (node:20-alpine), standalone output
- `web/.dockerignore` — isključuje node_modules, .next
- `infra/docker-compose.yml` — prošireno sa backend i web servisima, healthcheck na postgres
- `infra/.env` / `infra/.env.example` — prošireno sa backend i web varijablama
- `.github/workflows/ci.yml` — paralelni jobovi: .NET build+test i Next.js build
- ADR-013: Docker Compose strategija

---

## Faza 1 — MVP (Mesec 3–5) · Planirano

MVP za prvu autopraonicuu: rezervacije, terminal za radnike, vlasnički dashboard.

- Upravljanje rezervacijama (kreiranje, izmena, otkazivanje)
- Terminal za radnike (pregled dnevnog rasporeda, ažuriranje statusa)
- Vlasnički dashboard (pregled prihoda, zaposlenost kapaciteta)
- Osnovna notifikaciona podrška (email potvrde)

| Podfaza | Opis                                      | Status    |
| ------- | ----------------------------------------- | --------- |
| 1.1     | Backend: domenski model + rezervacije API | Završeno  |
| 1.2     | Web: online booking flow (mušterija)      | Završeno  |
| 1.3     | Web: terminal za radnike                  | Završeno  |
| 1.4     | Web: vlasnički dashboard                  | Završeno  |

#### Faza 1.1 — Backend: domenski model + rezervacije API

- Entiteti: `Bay`, `Service`, `Customer`, `Reservation` sa EF Core migracijama
- `ReservationStatus` enum: Pending, Confirmed, InProgress, Completed, Cancelled
- `ReservationSeed` — 6 fiksnih usluga (Car/SUV/Van × Basic/Deep)
- REST endpointi: `GET /services`, `GET /bays`, `GET /availability`, `POST /reservations`,
  `GET /reservations`, `PATCH /reservations/{id}/status`, `DELETE /reservations/{id}`
- Tenant resolving za javne endpointe putem `tenantSlug` query parametra
- Conflict detection sa `IgnoreQueryFilters()` za guest rezervacije
- ADR-014: Mašina stanja rezervacije

---

#### Faza 1.2 — Web booking flow (mušterija)

- Javna ruta `/book/[slug]` — bez autentikacije, dostupna svim mušterijama
- Četvorokorački booking flow: odabir usluge → datum → slobodan termin → unos podataka
- Fetch slobodnih termina putem `GET /availability`
- `POST /reservations` sa statusom `Pending` za guest rezervacije
- Email potvrda putem Resend odmah pri kreiranju rezervacije
- Success page `/book/[slug]/success` sa detaljima rezervacije
- ADR-015: Resend integracija za transakcione emailove

---

#### Faza 1.3 — Worker terminal

- Zaštićena ruta `/terminal/[slug]` — dostupna workerima i vlasnicima
- Prikaz rezervacija za tekući dan grupisanih po statusu (Na čekanju / Potvrđeno / U toku)
- Polling svakih 30 sekundi za real-time ažurnost
- Akcije po state mašini: Potvrdi → Počni → Završi / Otkaži
- Walk-in rezervacija direktno sa terminala (`CreatedBy = "Worker"`, status `Confirmed` odmah)
- `GET /bays` endpoint — lista aktivnih boksova za tenant
- `DevDataSeed` — seed worker naloga za dev okruženje
- Touch-friendly UI prilagođen tablet upotrebi
- ADR-016: Worker terminal arhitektura (polling vs WebSocket, role-based pristup)

---

#### Faza 1.4 — Vlasnički dashboard

- Zaštićena ruta `/dashboard/*` — dostupna samo Owner ulozi
- Sidebar navigacija sa tri sekcije: Rezervacije, Boksovi, Statistike
- Nakon logina, redirect prema roli: Owner → `/dashboard/reservations`, Worker → `/terminal/[slug]`
- `AuthResponse` proširena sa `TenantSlug` poljem — slug se čuva u `localStorage` pri loginu
- `apiFetch` automatski čita JWT token iz `localStorage` bez eksplicitnog prosleđivanja
- `dashboard-api.ts` — centralne fetch funkcije za owner dashboard
- Stranica rezervacija: lista u tabeli + dnevni kalendar po kolonama boksova, navigacija po danima
- Stranica boksova: pregled svih boksova, dodavanje, preimenovanje, toggle aktivnosti, soft delete
- Stranica statistika: KPI kartice za tekući dan i mesec (broj rezervacija, prihod od završenih)
- `BaysController` — odvojen od `ReservationsController`, Owner-only CRUD endpointi
- `GET /bays/public?tenantSlug=` — javni endpoint za terminal i booking flow
- `GET /reservations/stats?date=` — agregat po danu i mesecu, Owner only
- Walk-in dialog: slobodni datetime input zamenjen odvojenim date poljem i dropdown slotovima (08:00–17:30, svakih 30 min)
- ADR-017: Vlasnički dashboard arhitektura

---

## Faza 2 — Proširenje (Mesec 6–8) · Planirano

ANPR zaštita od krađe, B2B portal, notifikacije, mobilna aplikacija u punom obimu.

- ANPR integracija: automatsko prepoznavanje tablica na ulazu/izlazu
- B2B portal: samouslužna registracija poslovnih klijenata
- Notifikacije: SMS i Viber putem Infobip-a
- Mobilna aplikacija: kompletne funkcionalnosti za radnike i klijente
- Integracija skladišta objekata (MinIO)

---

## Faza 3 — SaaS zrelost (Mesec 9–11) · Planirano

Platforma sprema za scale: samouslužni onboarding, online plaćanja, eFaktura, pretplatna naplata.

- Samouslužni onboarding novih klijenata (bez manuelnog podešavanja)
- Online plaćanja putem AllSecure/Monri
- Integracija sa eFaktura sistemom (Srbija)
- Pretplatna naplata za SaaS licence

---

## Faza 4 — Rast (Mesec 12+) · Planirano

Optimizacija, napredne funkcije i skaliranje na više klijenata.

- Napredna analitika i izveštavanje
- Optimizacija performansi i troškova infrastrukture
- Nove funkcionalnosti prema povratnim informacijama klijenata

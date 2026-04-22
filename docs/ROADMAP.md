# Roadmap — WashBookPro

## Faza 0 — Temelji (Nedelja 1–12) · **U toku**

Postavljanje razvojnog okruženja, scaffold svih aplikacija i deployment pipeline-a.

| Podfaza | Period        | Opis                                                    | Status    |
| ------- | ------------- | ------------------------------------------------------- | --------- |
| 0.1     | Nedelja 1     | Repo setup + dokumentacioni temelj                      | Završeno  |
| 0.2     | Nedelja 1-2   | Lokalno razvojno okruženje: Node.js, PostgreSQL, Docker | Završeno  |
| 0.3     | Nedelja 3-4   | ASP.NET Core 10 backend scaffold sa modulima            | Završeno  |
| 0.4     | Nedelja 5-6   | PostgreSQL + EF Core + multi-tenant temelj              | Završeno  |
| 0.5     | Nedelja 7-8   | JWT autentikacija (registracija + login + refresh)      | Završeno  |
| 0.6     | Nedelja 9     | Next.js 16 web scaffold                                 | Završeno  |
| 0.7     | Nedelja 10    | React Native + Expo mobilni scaffold                    | Završeno  |
| 0.8     | Nedelja 11-12 | Docker Compose + CI/CD + deployment                     | Planirano |

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

---

## Faza 1 — MVP (Mesec 3–5) · Planirano

MVP za prvu autopraonicuu: rezervacije, terminal za radnike, vlasnički dashboard.

- Upravljanje rezervacijama (kreiranje, izmena, otkazivanje)
- Terminal za radnike (pregled dnevnog rasporeda, ažuriranje statusa)
- Vlasnički dashboard (pregled prihoda, zaposlenost kapaciteta)
- Osnovna notifikaciona podrška (email potvrde)

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

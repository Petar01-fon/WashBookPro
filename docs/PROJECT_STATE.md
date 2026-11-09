# PROJECT_STATE.md — WashBookPro

**Poslednje ažuriranje:** 2026-11-09
**Aktivan developer:** Solo (Petar Bogdanović)
**Trenutna faza:** Faza A, Sprint A1 (10. – 22. nov 2026): kritične popravke i
praćenje grešaka. Plan za ostatak A1 čeka Petrov nalog.

> **Jedini važeći plan je `docs/plan/WashBook-Plan-razvoja.md`** (ADR-029).
> Ovaj dokument prati samo trenutno stanje, otvorene nalaze i sledeći korak.
> Pravila rada su u `CLAUDE.md`. Nove ideje idu u `docs/ideje.md`.

---

## Trenutno stanje

Postoji: javna stranica za zakazivanje `/book/[slug]`, terminal za radnika
`/terminal/[slug]` (lista rezervacija, promena statusa, walk-in), dashboard
vlasnika (rezervacije, kalendar, boksovi, usluge, statistika), customer auth i
profil, landing stranica i HTML email potvrde (Resend).

- **Dev tenant:** slug `dev-wash`, ID `80b059d6-c10f-47a6-8296-797009d5aa3d`
- **Testovi:** `backend/tests/WashBookPro.Api.Tests` (xUnit v3 + Testcontainers,
  ADR-027), 44 test metode: availability 12, kreiranje i walk-in 21,
  tenant bootstrap 6, CORS 3, smoke 2. CI ih pokreće na svaki push na `main`.
  Frontend testovi ne postoje.
- **Produkcija (kod postoji, server ne):** `infra/docker-compose.prod.yml` sa
  Caddy-jem, migration bundle, komanda `bootstrap-tenant`, uputstvo u
  `infra/README.md`. Nema servera ni DNS-a. Domen: `washbook.tech` (`app.` za
  web, `api.` za API). `backend/Dockerfile` je zakucan na `linux-x64`, što treba
  rešiti ako server bude ARM (Oracle Always Free).

---

## Sprint A1 — stanje stavki

Provereno čitanjem koda 2026-11-09 (bez živog testa).

| Stavka iz plana | Stanje |
|---|---|
| Eksplicitna provera `TenantId` u `UpdateStatus` i `CancelReservation` | ✅ Urađeno (`3924047`) |
| UTC normalizacija ulaznih `DateTime` vrednosti | ✅ Urađeno za `startsAt` (`04bf85c`): vrednost bez zone → 400. Ostali ulazi su `DateOnly` |
| `timeZone: 'Europe/Belgrade'` pri formatiranju | ✅ Urađeno. Formatiranje je ispravno od `fe93b3e` (provereno 2026-11-09 u 4 zone). Popravljen pomak dana `±86400000` u `ReservationsView` oko prelaska na letnje/zimsko vreme (Gate 3) |
| `WalkInDialog.tsx` nezavisan od zone browsera | ✅ Urađeno (`fe93b3e`) |
| `[Authorize(Roles = ...)]` na staff endpointima | ✅ Urađeno (`3924047`) |
| Ponovna upotreba `Customer` po telefonu unutar tenanta | ✅ Postoji (`ReservationsController.cs`, pretraga po `Phone` + `TenantId`) |
| Rate limit na javnom `POST /reservations` | ❌ Nije urađeno |
| Sentry na backendu i u Next.js-u | ❌ Nije urađeno. Novi spoljni servis, traži odobrenje |
| Serilog (`TenantId`, `UserId`, `RequestId`) + Seq u `docker compose` | ❌ Nije urađeno. Nova zavisnost i kontejner, traže odobrenje |
| Health check endpoint | 🟡 `/health` postoji, ali ne proverava bazu |
| ADR „Strateški fokus: alat za perionice" | ✅ ADR-029 (`d136dcd`) |

Kandidati za A1 iz starih nalaza (stvarni bagovi ili bezbednost):
- **NU1903:** `Microsoft.OpenApi` 2.0.0 (GHSA-v5pm-xwqc-g5wc, visoka ozbiljnost),
  ispravljeno u 2.7.5. Ulazi preko `Microsoft.AspNetCore.OpenApi` 10.0.5;
  `AddOpenApi()` je u `Program.cs` bez uslova. Promena verzije traži odobrenje.
- **CS8629:** `ServicesController.cs:68`, `(Guid)tenantId` bez provere; bez
  `tenant_id` u tokenu baca `InvalidOperationException`.

---

## Šta nedostaje za A2 i A3 (iz pregleda koda)

Odluke koje treba doneti pre početka A2:

- **Model „pranja".** Danas postoji samo `Reservation`. Plan traži unos pranja
  sa tablicom, uslugom, cenom, načinom plaćanja i radnikom. Odluka: proširiti
  `Reservation` ili uvesti poseban entitet.
- **Walk-in traži ime, telefon i email kao obavezne** (`WalkInRequest.cs`).
  Sa tim se ne postiže unos za manje od 20 sekundi.
- **Nema snimljene cene.** `GetStats` računa prihod iz trenutne cene usluge,
  pa promena cenovnika menja istoriju. Bez snimljene cene poređenje sa kasom
  nema smisla.
- Ne postoje: PIN prijava radnika, radnik na pranju/rezervaciji, status
  „nije došao", razlog storniranja, razlog za cenu ispod cenovnika, `AuditLog`,
  unos stanja kase. `DELETE /reservations/{id}` već ne briše, nego postavlja
  status `Cancelled`.

---

## Otvoreni nalazi

### UI prazna stanja i obrada grešaka (iz P1)

Prioritet: **B** i **C**.

- **A** `web/app/(dashboard)/dashboard/services/page.tsx:129-156` — sa 0 usluga samo naslov i dugme, bez poruke. Potvrđeno uživo.
- **B** `web/app/(dashboard)/dashboard/reservations/ReservationsView.tsx:17-19` — greška API-ja prikaže "Nema rezervacija za izabrani dan." (lažno prazno stanje) i unhandled `ApiError`. Potvrđeno uživo.
- **C** `web/app/(dashboard)/dashboard/reservations/ReservationCalendar.tsx:17-27` — boksovi se izvode iz rezervacija, pa boks bez rezervacija za dan nije vidljiv. Potvrđeno uživo.
- **D** `web/app/terminal/[slug]/WalkInDialog.tsx:125-139` — prazan `<select>` za usluge ili boksove bez poruke (samo kod).
- **E** `web/app/(dashboard)/dashboard/bays/BaysView.tsx:99-162` — 0 boksova: samo red za dodavanje, bez poruke (samo kod).
- **F** `web/app/(dashboard)/dashboard/services/page.tsx:136` — `categoryLabel[category]` nema fallback (samo kod).
- **G** `web/app/(dashboard)/dashboard/services/page.tsx:68-77` — `load()` bez `catch`, prazna stranica pri grešci (samo kod).
- **H** `web/app/(dashboard)/dashboard/stats/StatsView.tsx:106` — `: null` pri grešci, ostaje samo banner (samo kod, manji rizik).
- **I** `web/app/terminal/[slug]/TerminalView.tsx:36-38` — bez tokena `loading` ostaje true, "Učitavanje..." zauvek (samo kod).
- **J** `web/app/profil/page.tsx:476` — `loading || !profile` bez poruke; prazno telo odgovora daje skeleton zauvek (teorijski).

Referentni obrazac: booking flow (`web/app/book/[slug]/CategoryStep.tsx:61-63`, `DateTimeStep.tsx:101-103`).

### Ostalo

- Walk-in UI (`WalkInDialog`) ignoriše `emailSent` iz odgovora (iz P2).
- Panel "Pregled rezervacije" na booking flow-u prikazuje `undefined · …` u redu
  "Kategorija" (viđeno u P2, nije dijagnostikovano).
- Testovi ne pokrivaju: race condition (dva istovremena POST-a na isti termin),
  `GET /reservations`, `PATCH .../status`, `DELETE`, statistiku, auth, customer
  auth, usluge i boksove. A8 (same-day cutoff) se preskače 23:00–00:02 po Beogradu.
- Ostatak P3: inline `toLocaleDateString("sr-Latn-RS", …)` umesto `formatDateSr`
  u `ReservationsView.tsx`, `StatsView.tsx` i `TerminalView.tsx`.

---

## Otvorena pitanja

- **Server za A4.** Kandidati: Oracle Always Free (ARM, traži prilagođen
  Dockerfile) i Netcup. Odluka pre Sprinta A4.
- **Resend produkcija (A4).** Emailovi završavaju u spamu; free plan bez
  verifikovanog domena šalje samo na adresu vlasnika naloga. Potrebna SPF/DKIM
  verifikacija `washbook.tech`.
- **Cena pretplate.** Radna pretpostavka iz plana: 30–70 € mesečno po lokaciji;
  proverava se u razgovorima sa perionicama.

---

## Istorija (završeno pre plana od 2026-11-09)

Detalji su u git istoriji i ADR-ovima.

- **Faza 0 i Faza 1.1–1.8:** temelji, rezervacije API, booking flow, terminal,
  dashboard, usluge, customer auth i profil, landing (ADR-001 do ADR-025).
- **P0 — korektnost zavisna od okruženja:** `936e2ff` (uklonjen otvoren
  `POST /auth/register`), `3924047` (uloge i `TenantId`), `04bf85c` (UTC
  normalizacija), `294cb24` (granice dana po Beogradu), `fe93b3e` (datum i vreme
  u web-u po Beogradu).
- **P1 — determinizam dev okruženja:** `2a1c748` (fiksni ID-jevi u dev seed-u).
- **P2 — Result tip i email signal:** `9bb3e59`, `1f5039b`, `388c954`.
- **T1 — test projekat:** `d6df79e`, `34d54d6`, `5cffb47` (ADR-027).
- **Priprema produkcije (kod):** `c7ca862` (CORS iz konfiguracije), `f866bdf`
  (pnpm), `e7d2e36` (migration bundle, `bootstrap-tenant`), `2bd77a0` (prod
  compose, Caddy, uputstvo).
- **2026-11-09:** usvojen plan razvoja, ADR-029, zamenjeni ADR-026 i ADR-028,
  obrisani stari planovi (`d136dcd`).

---

## Ključni fajlovi za novu sesiju

- **Plan** — `docs/plan/WashBook-Plan-razvoja.md`, `docs/plan/WashBook-Plan-testiranja.md`
- **Auth** — `web/lib/customer-auth.ts` i `web/lib/auth.ts` (dva odvojena sistema — ADR-022)
- **API klijent layer** — `web/lib/{api,booking-api,dashboard-api,profile-api}.ts`
- **Datumi** — `web/lib/date-format.ts`, `backend/.../Common/Formatting/SerbianDateFormatter.cs`
- **Design tokens** — `web/app/globals.css` (komentar `/* WashBook tokens */`)
- **Booking flow** — `web/app/book/[slug]/`
- **Worker terminal** — `web/app/terminal/[slug]/`
- **Backend moduli** — `backend/src/WashBookPro.Api/Modules/{Auth,Customers,Reservations,Tenants}/`
- **Backend testovi** — `backend/tests/WashBookPro.Api.Tests/` (ADR-027)
- **Produkcija** — `infra/docker-compose.prod.yml`, `infra/Caddyfile`, `infra/README.md`

---

## Česti razvojni zadaci

| Zadatak | Komanda / URL |
|---------|---------------|
| Pokretanje okruženja | `docker compose up --build -d` iz `/infra/` |
| Backend Scalar API docs | `http://localhost:8080/scalar/v1` |
| pgAdmin | `http://localhost:5050` |
| Backend testovi | `dotnet test` iz `backend/` (traži Docker) |

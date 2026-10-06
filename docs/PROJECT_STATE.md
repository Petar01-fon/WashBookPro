# PROJECT_STATE.md — WashBookPro

**Poslednje ažuriranje:** 2026-10-06
**Aktivan developer:** Solo (Petar Bogdanović)
**Trenutna faza:** Faza 1 — sanacija (plan P0–P5), P0 i P1 završeni; sledeći je P2 (čeka Petrov nalog)

> Za istoriju implementiranih funkcionalnosti videti `docs/ROADMAP.md`.
> Ovaj dokument fokusira se na **trenutno stanje i sledeće korake**.
> Pravila rada su u `CLAUDE.md`. Od 2026-10-06 planiranje i implementacija se
> rade direktno u Claude Code-u (bez posredničkog chata).

---

## Trenutno stanje

Platforma ima booking flow, worker terminal, owner dashboard, upravljanje
uslugama, Customer auth + profil i landing stranicu.
Aktivan tenant za razvoj: **dev-wash** (ID: `80b059d6-c10f-47a6-8296-797009d5aa3d`).

### Završeno od prethodnog ažuriranja (2026-05-07)

- ADR-024: razdvojene rute — `POST /reservations` (AllowAnonymous, Customer)
  i `POST /reservations/walk-in` (Worker/Owner), `CreatedBy` određuje server
- ADR-025: migracije i dev seed pri startu backend-a
- Booking wizard `/book/[slug]` (redesign): kategorija → usluga, datum/vreme
  (`react-day-picker`), podaci kupca (`plateNumber` nullable varchar(16) za
  budući ANPR), potvrda sa 409 race-condition oporavkom
- Availability algoritam: slobodni prozori po boksu, simetrični ±15 min
  buffer, 30 min same-day cutoff po beogradskom vremenu, overlap upit za konflikte
- HTML email potvrde (inline stilovi, `WebUtility.HtmlEncode` na korisničkim
  vrednostima), vreme konvertovano u Beograd, podaci o tenantu (opcioni telefon)
- Success stranica sa `.ics` preuzimanjem i eksplicitnim `Europe/Belgrade`

---

## Plan sanacije P0–P5

### P0 — korektnost zavisna od okruženja (ZAVRŠEN 2026-10-06)

**P0.0 — empirijska provera: ZAVRŠENO 2026-10-06** (Docker :8080, pravi HTTP +
`psql`, test podaci obrisani posle provere). Rezultati:

1. **UTC normalizacija — BAG.** `POST /reservations` i `POST /reservations/walk-in`:
   `startsAt` sa `Z` → 201 ✓; sa ofsetom (`+01:00`) i bez sufiksa → **500**
   (`Cannot write DateTime with Kind=Local/Unspecified to ... timestamp with time zone`),
   puca u konflikt-upitu (`ReservationsController.cs:342`), pre upisa.
2. **Customer JWT na staff endpointima — delimično.** Customer JWT nema `tenant_id`;
   `GET /reservations` → 200 `[]`, `PATCH .../status` i `DELETE` → 404 (umesto 403).
   Podatke štiti samo query filter, ne autorizacija.
3. **Cross-tenant — drži.** Owner drugog tenanta: `GET` → 200 `[]`, `PATCH`/`DELETE`
   na tuđu rezervaciju → 404. `FindAsync` **poštuje** global query filter;
   eksplicitna `TenantId` provera je defense-in-depth, ne zakrpa za aktivnu rupu.
4. **Frontend vremenska zona — BAG** (proveravano u `washbook-web` kontejneru, node 20,
   različiti `TZ`): `formatTime` i `WalkInDialog.tsx:81` zavise od zone browsera
   (New York: 08:00Z prikazano kao 03:00, walk-in 09:00 poslat kao 14:00Z).
   `toISOString().split("T")[0]` greši **i u Beogradu** između ponoći po lokalnom i
   ponoći po UTC vremenu (terminal/dashboard prikazuju prethodni dan).

**Novo otkriveno tokom P0.0:**
- **`POST /auth/register` je otvoren bez autentifikacije** — **REŠENO** (`936e2ff`).
  Svako može registrovati `Owner` (ili proizvoljnu ulogu) za bilo koji `tenantId`.
  Nijedan klijent (web, mobile) ga ne poziva.
- `GetReservations` i `GetStats` računaju granice dana u UTC-u umesto po Beogradu —
  **potvrđeno i REŠENO u Gate 4** (`294cb24`).

Commit-i po gate-ovima:
- Gate 1 — uklonjen `POST /auth/register`: `936e2ff`
- Gate 2 — uloge Worker/Owner i TenantId na staff endpointima (P0.2): `3924047`
- Gate 3 — UTC normalizacija `startsAt`, vrednost bez zone → 400 (P0.1): `04bf85c`
- Gate 4 — granice dana i meseca po Beogradu u `GetReservations`/`GetStats` (P0.5): `294cb24`
- Gate 5 — datum i vreme u web-u po Beogradu (P0.3 + P0.4): `fe93b3e`

Provereno: `ReservationTable.tsx` i `summary.ts` prošli su samo `tsc --noEmit` i lint
(bez novih grešaka). Nisu prošli zone test ni živi test u browseru.

### P1 — determinizam dev okruženja (ZAVRŠEN 2026-10-06)

Cilj: sveži start (`docker compose down -v` + `up --build -d`) daje iste ID-jeve usluga, boksa i korisnika.

Commit-i po gate-ovima:
- Gate 0 — istraživanje "null render" (bez commita): uzrok nije utvrđen, Petar se ne seća ekrana. Nalazi A–J su u sekciji "Otvoreni nalazi iz P1"; nijedan ne ulazi u P1.
- Gate 1 — reprodukcija svežeg starta (bez commita): dva čista starta posle `down -v`, `Users` = 2 u oba. "Users prazna" nije reprodukovana. Uzrok (raniji seed nije kreirao tenant ni korisnike) rešen je u ADR-025 (`188cd8c`).
- Gate 2 — fiksni ID-jevi u dev seed-u (usluge, Bay 1, owner, worker): `2a1c748`
- Gate 3 — preskočen (uslov nije ispunjen, vidi Gate 1).
- Gate 4 — zatvaranje P1 i ažuriranje dokumentacije: ovaj commit (`docs: close P1 and update project state`).

Backup pre reseta (`p1_backup.dump`) ostaje u scratchpad-u i ne vraća se automatski.

**Sledeće:** P2 — Result tip i email signal (ne počinje bez Petrovog naloga).

### P2 — Result tip i email signal

### P3 — konsolidacija formatiranja datuma (ostatak)

Zona je rešena u `fe93b3e` (P0.3/P0.4): `formatTimeSr`, `belgradeDateString`,
`belgradeTimeString` i `belgradeWallTimeToUtcIso` u `web/lib/date-format.ts`.
Ostaje:
- inline `toLocaleDateString("sr-Latn-RS", …)` umesto `formatDateSr` u
  `ReservationsView.tsx`, `StatsView.tsx` i `TerminalView.tsx`

### P4 — ADR dokumentacija

Uključuje ADR-026 (booking redesign) — pominjan u planiranju, ali **još nije
napisan** (u `docs/decisions/` postoje samo ADR-001 do ADR-025).

ADR kandidati iz P0:
- "API ugovor: `startsAt` mora sadržati zonu; vrednost bez zone → 400"
- "Staff registracija uklonjena do Faze 3 onboardinga"

### P5 — zauzetost boksa kao stvarno praćenje vremena početka

---

## Otvoreni nalazi iz P1 (van P1)

Nalazi iz P1 (Gate 0 i build) nisu deo P1 i ne popravljaju se u P1.

### UI prazna stanja i obrada grešaka

Prioritet: **B** i **C**.

- **A** `web/app/(dashboard)/dashboard/services/page.tsx:129-156` — sa 0 usluga prikazuje se samo naslov i dugme, bez poruke. Potvrđeno uživo. Ako se pokaže da seed može da padne, A se razmatra kroz uzrok.
- **B** `web/app/(dashboard)/dashboard/reservations/ReservationsView.tsx:17-19` — greška API-ja prikaže "Nema rezervacija za izabrani dan." (lažno prazno stanje) i unhandled `ApiError`. Potvrđeno uživo.
- **C** `web/app/(dashboard)/dashboard/reservations/ReservationCalendar.tsx:17-27` — boksovi se izvode iz rezervacija, pa boks bez rezervacija za izabrani dan nije vidljiv u kalendaru. Potvrđeno uživo.
- **D** `web/app/terminal/[slug]/WalkInDialog.tsx:125-139` — prazan `<select>` za usluge ili boksove bez poruke (samo kod).
- **E** `web/app/(dashboard)/dashboard/bays/BaysView.tsx:99-162` — 0 boksova: samo red za dodavanje, bez poruke (samo kod).
- **F** `web/app/(dashboard)/dashboard/services/page.tsx:136` — `categoryLabel[category]` nema fallback (samo kod).
- **G** `web/app/(dashboard)/dashboard/services/page.tsx:68-77` — `load()` bez `catch`, prazna stranica pri grešci (samo kod).
- **H** `web/app/(dashboard)/dashboard/stats/StatsView.tsx:106` — `: null` pri grešci, ostaje samo banner (samo kod, manji rizik).
- **I** `web/app/terminal/[slug]/TerminalView.tsx:36-38` — bez tokena `loading` ostaje true, "Učitavanje..." zauvek (samo kod).
- **J** `web/app/profil/page.tsx:476` — `loading || !profile` bez poruke; prazno telo odgovora daje skeleton zauvek (teorijski).

Referentni obrazac: booking flow (`web/app/book/[slug]/CategoryStep.tsx:61-63`, `DateTimeStep.tsx:101-103`).
Nije pokriveno uživo: worker nalog, anonimni posetilac na terminalu i dashboardu, `/dashboard/bays`, `/dashboard/stats`.

### Build upozorenja (backend)

- **NU1903** — `Microsoft.OpenApi` 2.0.0, GHSA-v5pm-xwqc-g5wc, visoka ozbiljnost: "Circular schema references may terminate OpenAPI parsing". Ispravljeno u 2.7.5. Nije samo dev zavisnost: paket ulazi preko `Microsoft.AspNetCore.OpenApi` 10.0.5, a `AddOpenApi()` je u `Program.cs:75` bez uslova. Dev je samo mapiranje endpoint-a (`Program.cs:79-82`). Popravka traži promenu verzije paketa, pa je potrebno odobrenje. Uticaj nije ispitan do kraja (aplikacija generiše OpenAPI dokument, ne parsira ga).
- **CS8629** — `backend/src/WashBookPro.Api/Modules/Reservations/ServicesController.cs:68`: `(Guid)tenantId` je nullable cast bez provere. Ako `TenantId` nije u tokenu, baca `InvalidOperationException`. Nije ispravljeno.

## Eskalirani problemi

- **REŠENO** (`936e2ff`): `POST /auth/register` otvoren bez autentifikacije.
- **REŠENO** (`3924047`): `[Authorize]` bez `Roles=` na staff endpointima u
  `ReservationsController.cs` — `GetReservations`, `UpdateStatus`,
  `CancelReservation`. Customer JWT je ranije prolazio autorizaciju (P0.0).
- **Neograničen rast `Customer` tabele** — anonimni POST kreira novi red za
  svaki nepoznat broj telefona.

---

## Sledeće (posle sanacije)

### ANPR spike — medium, visoka neizvesnost

Validacija da PlateRecognizer API radi sa stvarnim kamerama u prijateljevoj
perionici. Cilj: jedna detektovana tablica → event na backend → prikaz na
terminalu. ADR piše se tokom spike-a.

**Zašto prioritet:** ANPR je primarni tehnički diferencijator. Dok god nije
potvrđen u realnom okruženju, B2B i fleet feature mogu biti buildani na
pogrešnoj pretpostavci.

### Onboarding 2-3 nepoznatih tenanta — non-tech, high impact

Onboarding vlasnika perionica bez tehničkog iskustva otkriće friction u
signup procesu i booking flowu koji dev-wash ne može da pokrije.

**Zašto prioritet:** Jedan aktivan tenant nije market fit validacija.

---

## Otvorena pitanja

**B2B fleet vs. many small tenants** — Platforma može ići ka intenzivnoj
akviziciji malih perionica (niži ARPU, brže zatvaranje) ili ka B2B fleet
managementu za kompanije sa flotama (visok ARPU, duži ciklus prodaje). Odluka
utiče na prioritizaciju B2B portala, eFaktura integracije i fleet ANPR feature-a.
Nije donesena.

**Resend production setup** — Trenutna konfiguracija šalje sa development naloga.
Poznati problemi:
- emailovi potvrde završavaju u spamu — potrebna SPF/DKIM verifikacija domena
- Resend free plan bez verifikovanog domena šalje samo na adresu vlasnika naloga

Pre onboardinga prvog eksternog tenanta: lični nalog, verifikovan custom domain,
test isporuke na neregistrovane adrese. Nije bloker za razvoj, jeste za prvi
realni tenant.

---

## Deferred (i zašto)

- **Mobilna app (Expo)** — čeka stabilan web booking flow; mobile i web moraju
  biti konzistentni.
- **SMS/Viber (Infobip)** — čeka eksplicitnu potražnju plaćajućeg tenanta.
- **B2B portal** — čeka razrešenje otvorenog pitanja pravca (videti gore).
- **Faza 3+** — SuperAdmin dashboard, self-service onboarding, online plaćanja,
  subscription billing, produkcioni domen (`washbook.rs` ili `washbook.app`).

---

## Ključni fajlovi za novu sesiju

- **Auth** — `web/lib/customer-auth.ts` i `web/lib/auth.ts` (dva odvojena sistema — ADR-022)
- **API klijent layer** — `web/lib/{api,booking-api,dashboard-api,profile-api}.ts`
- **Design tokens** — `web/app/globals.css` (komentar `/* WashBook tokens */`)
- **Booking flow** — `web/app/book/[slug]/`
- **Worker terminal** — `web/app/terminal/[slug]/`
- **Backend moduli** — `backend/src/WashBookPro.Api/Modules/{Auth,Customers,Reservations,Tenants}/`
- **Dev tenant** — ID `80b059d6-c10f-47a6-8296-797009d5aa3d`, slug `dev-wash`

---

## Česti razvojni zadaci

| Zadatak | Komanda / URL |
|---------|---------------|
| Pokretanje okruženja | `docker compose up --build -d` iz `/infra/` |
| Backend Scalar API docs | `http://localhost:8080/scalar/v1` |
| pgAdmin | `http://localhost:5050` |

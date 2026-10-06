# P0-PLAN.md — plan ispravki P0.1–P0.5

**Napravljeno:** 2026-10-06, posle empirijske provere P0.0 (rezultati u `docs/PROJECT_STATE.md`).
**Status:** odobren od strane Petra, nije započet.
Privremeni fajl — kada se svih pet gate-ova završi i commituje, obrisati ga i
ažurirati `docs/PROJECT_STATE.md`.

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`. Ukratko:

- **Gate po gate.** Posle svakog gate-a STANI: pokaži pun sadržaj svakog izmenjenog
  fajla (kao tekst u odgovoru, ne samo tool poziv), izlaz build-a i doslovan izlaz
  živog testa. Čekaj Petrovo odobrenje.
- **Jedan commit po gate-u**, tek posle odobrenja. Conventional Commits, jednolinijski
  `git commit -m "..."`, **bez AI atribucije** (bez `Co-Authored-By`, bez "Generated with").
  Nema push-a.
- **Ne radi ništa van ovog plana.** Ako nešto izgleda pogrešno ili nedostaje — stani i pitaj.
- **Ne pretpostavljaj — dokaži.** Za svaku tvrdnju o vremenu/zonama nalepi pravi izlaz komande.
- Razgovor sa Petrom na srpskom (latinica). Kod i identifikatori na engleskom.
- Ne menjaj ništa iz "Locked Decisions" u `CLAUDE.md` (npr. `CreateReservationAsync`
  namerno nema buffer; `JsonStringEnumConverter` NIJE registrovan — enum-i su int).

---

## Okruženje i zamke (naučeno tokom P0.0)

- Docker je kanonski: `docker compose up --build -d` iz `/infra/`. Backend `http://localhost:8080`,
  web `http://localhost:3000`. **Nikad** `dotnet run` na 5033.
- Posle izmene backend koda: `cd infra && docker compose up --build -d backend`.
  Ako je tabela `Users` prazna posle build-a: `docker compose restart backend`.
- Kontejneri: `washbook-backend`, `washbook-web`, `washbook-postgres`, `washbook-pgadmin`.
- Baza: `docker exec washbook-postgres psql -U washbook -d washbookpro -c '...'`
  - **Heredoc u psql ne radi bez `-i`** (`docker exec -i ...`). Najsigurnije: više `-c` argumenata
    i `-1` (jedna transakcija) + `-v ON_ERROR_STOP=1`.
  - Stringove u SQL-u unutar bash single quote-a piši kao `$$tekst$$`.
  - `set timezone='UTC';` pre SELECT-a da bi `timestamptz` bio prikazan u UTC.
- `jq` nije instaliran. JWT iz JSON-a: `sed -E 's/.*"accessToken":"([^"]+)".*/\1/'`.
- **Windows node ignoriše IANA `TZ`** (radi samo `TZ=UTC`). Testove zona radi u Linux kontejneru:
  `MSYS_NO_PATHCONV=1 docker exec -e TZ=America/New_York washbook-web node /tmp/x.js`
  (fajl ubaci sa `docker cp "$(cygpath -w <putanja>)" washbook-web:/tmp/x.js`, na kraju ga obriši).
- Backend radi u `Development` modu → 500 greške vraćaju stack trace u telu odgovora.
  `grep -E "WashBookPro|^HTTP"` izdvaja relevantne linije.
- Privremene skripte/tokene drži u scratchpad direktorijumu sesije, ne u repou. Obriši tokene na kraju.

### Dev podaci (ne hardkoduj u kod, samo za testove)

| Šta | Vrednost |
|---|---|
| Tenant `dev-wash` | `80b059d6-c10f-47a6-8296-797009d5aa3d` |
| Owner | `owner@devwash.local` / `Owner123!` → `POST /auth/login` |
| Worker | `worker@devwash.local` / `Worker123!` |
| Bay 1 | `4132e120-1fb7-4d03-9a0e-28576fabc199` (jedini boks) |
| Usluga 60 min | `6c872264-a638-407b-9f04-79b759c6a512` ("Kombi — obično pranje") |

ID-jevi usluga/boksova se menjaju posle `docker compose down -v` — ako ne rade, ponovo ih
pročitaj: `select "Id","Name","DurationMinutes" from "Services";` i `select "Id","Name" from "Bays";`.

Stanje baze pre testova (proveri na početku i na kraju svakog gate-a — mora biti isto):
`1 tenant, 3 rezervacije, 1 CustomerAccount`.

### Konvencija test podataka

- Datum: **2026-12-15** (CET, UTC+01:00, bez DST-a), daleko od stvarnih rezervacija.
- `customerName`: `P0 TEST`; email: `p0test@example.com` (Resend će odbiti — backend samo loguje, OK).
- Čišćenje (posle svakog gate-a koji pravi podatke):

```bash
docker exec washbook-postgres psql -U washbook -d washbookpro -v ON_ERROR_STOP=1 -1 \
 -c 'delete from "Reservations" where "CustomerId" in (select "Id" from "Customers" where "Name"=$$P0 TEST$$);' \
 -c 'delete from "Customers" where "Name"=$$P0 TEST$$;' \
 -c 'delete from "CustomerAccounts" where "Email"=$$p0customer@example.com$$;' \
 -c 'delete from "Users" where "Email"=$$p0owner@example.com$$;' \
 -c 'delete from "Tenants" where "Slug"=$$p0-test-wash$$;' \
 -c 'select (select count(*) from "Tenants") tenants, (select count(*) from "Reservations") reservations, (select count(*) from "CustomerAccounts") customer_accounts;'
```

---

## Gate 1 — ukloniti `POST /auth/register`

**Zašto:** P0.0 je pokazao da je endpoint otvoren bez autentifikacije — svako može
registrovati `Owner` (ili bilo koju ulogu, `Role` je slobodan string) za bilo koji
`tenantId`. Nijedan klijent (web, mobile) ga ne poziva; dev seed (`DevDataSeed.cs`)
pravi korisnike direktno. Petar je odlučio: **ukloniti**.

**Izmene** (sve u `backend/src/WashBookPro.Api/Modules/Auth/`):

- `AuthController.cs` — obrisati akciju `Register` (ceo `[HttpPost("register")]` metod).
  `Login` i `Refresh` ostaju netaknuti.
- `Services/IAuthService.cs` — obrisati `Task<AuthResponse> RegisterAsync(RegisterRequest request);`
- `Services/AuthService.cs` — obrisati metodu `RegisterAsync`.
- `Dtos/RegisterRequest.cs` — obrisati fajl.
- Proveri `grep -rn "RegisterRequest\|RegisterAsync" backend/src --include=*.cs` (ignoriši `/obj/`
  i `CustomerRegisterRequest` — to je drugi, customer sistem i NE dira se).
  Mora ostati 0 pogodaka.
- **Ne dirati** `/auth/customer/register` (CustomerAuthController) — to je B2C registracija i ispravna je.

**Provera:**

1. `cd backend && dotnet build` → 0 errors.
2. `cd infra && docker compose up --build -d backend`.
3. Ponovi napad iz P0.0 — mora vratiti **404**:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:8080/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"p0owner@example.com","password":"P0test123!","role":"Owner","tenantId":"80b059d6-c10f-47a6-8296-797009d5aa3d"}'
   ```
4. Owner login i dalje radi (200, telo sadrži `accessToken`).
5. `select count(*) from "Users" where "Email"=$$p0owner@example.com$$;` → 0.

**Commit (posle odobrenja):** `fix(auth): remove unauthenticated staff register endpoint`

---

## Gate 2 — uloge i eksplicitni `TenantId` na staff endpointima (P0.2)

**Zašto:** P0.0: customer JWT (nema `tenant_id` claim, uloga `Customer`) prolazi
autorizaciju na `GET /reservations` (200 `[]`), `PATCH /reservations/{id}/status` (404),
`DELETE /reservations/{id}` (404). Treba 403. Cross-tenant izolacija trenutno drži samo
zahvaljujući EF global query filteru (`FindAsync` ga poštuje — dokazano); eksplicitna
`TenantId` provera je defense-in-depth.

**Izmene** u `backend/src/WashBookPro.Api/Modules/Reservations/ReservationsController.cs`:

- `GetReservations` (`[HttpGet("/reservations")]`): `[Authorize]` → `[Authorize(Roles = "Worker,Owner")]`.
- `UpdateStatus` (`[HttpPatch("/reservations/{id}/status")]`) i
  `CancelReservation` (`[HttpDelete("/reservations/{id}")]`):
  - `[Authorize]` → `[Authorize(Roles = "Worker,Owner")]`
  - na početku: `var tenantId = _tenantContext.TenantId; if (tenantId is null) return Unauthorized();`
    (isti obrazac kao `CreateWalkIn` i `GetStats` u istom fajlu)
  - `await _db.Reservations.FindAsync(id)` →
    `await _db.Reservations.FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId)`
    (isti obrazac kao `BaysController.cs` ~linije 90 i 110; CLAUDE.md gotcha: ne koristiti `FindAsync`)
  - ostatak metoda (Completed provera, promena statusa) ostaje isti.
- `GetStats` već ima `Roles = "Owner"` — ne dirati.

**Provera** (posle `dotnet build` + `docker compose up --build -d backend`):

Pripremi test podatke:
```bash
API=http://localhost:8080; SVC=6c872264-a638-407b-9f04-79b759c6a512; BAY=4132e120-1fb7-4d03-9a0e-28576fabc199
OT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"owner@devwash.local","password":"Owner123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
# test rezervacija u dev-wash (walk-in, Z format)
curl -s -X POST $API/reservations/walk-in -H 'Content-Type: application/json' -H "Authorization: Bearer $OT" \
  -d "{\"serviceId\":\"$SVC\",\"bayId\":\"$BAY\",\"startsAt\":\"2026-12-15T14:00:00Z\",\"customerName\":\"P0 TEST\",\"customerPhone\":\"+381600000002\",\"customerEmail\":\"p0test@example.com\"}"
# → zapamti "id" kao R
# customer nalog
CT=$(curl -s -X POST $API/auth/customer/register -H 'Content-Type: application/json' \
  -d '{"firstName":"P0","lastName":"Test","email":"p0customer@example.com","phoneNumber":"+381600000003","password":"P0test123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
```

Drugi tenant + njegov owner. **`/auth/register` više ne postoji (Gate 1)**, pa owner-a ubaci SQL-om,
kopirajući bcrypt hash od `owner@devwash.local` (lozinka će biti ista: `Owner123!`):
```bash
docker exec washbook-postgres psql -U washbook -d washbookpro -v ON_ERROR_STOP=1 -1 \
 -c 'insert into "Tenants"("Id","Name","Slug","IsActive","CreatedAt") values ($$0f0f0f0f-0000-4000-8000-00000000f0f0$$,$$P0 Test Wash$$,$$p0-test-wash$$,true,now());' \
 -c 'insert into "Users"("Id","TenantId","Email","PasswordHash","Role","CreatedAt") select gen_random_uuid(), $$0f0f0f0f-0000-4000-8000-00000000f0f0$$, $$p0owner@example.com$$, "PasswordHash", $$Owner$$, now() from "Users" where "Email"=$$owner@devwash.local$$;'
O2=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"p0owner@example.com","password":"Owner123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
```
(Ako login za `p0owner` ne uspe, prvo proveri kako `AuthService.LoginAsync` traži korisnika — prijavi Petru, ne improvizuj.)

Očekivani rezultati — nalepi doslovan izlaz:

| Poziv | Token | Očekivano |
|---|---|---|
| `GET /reservations?date=2026-12-15` | customer `CT` | **403** |
| `PATCH /reservations/$R/status` `{"status":2}` | customer `CT` | **403** |
| `DELETE /reservations/$R` | customer `CT` | **403** |
| `GET /reservations?date=2026-12-15` | owner2 `O2` | 200 `[]` |
| `PATCH /reservations/$R/status` | owner2 `O2` | **404** |
| `DELETE /reservations/$R` | owner2 `O2` | **404** |
| `GET /reservations?date=2026-12-15` | dev-wash owner `OT` | 200, sadrži R |
| `PATCH /reservations/$R/status` `{"status":2}` | dev-wash owner `OT` | **204**, u bazi `Status=2` |
| isto sa worker tokenom (`worker@devwash.local`) | worker | 200 / 204 |

Posle: čišćenje (komanda iz sekcije "Konvencija test podataka"), stanje baze mora biti 1/3/1.

**Commit:** `fix(reservations): restrict staff endpoints to Worker/Owner and scope by tenant`

---

## Gate 3 — UTC normalizacija ulaznog `startsAt` (P0.1)

**Oprez:** ovo je booking-integrity kod. Ne diraj konflikt-upit, `GetAvailability`, ni
odsustvo buffera u kreiranju rezervacije. Menja se SAMO validacija/normalizacija ulaza.

**Zašto:** P0.0: `startsAt` sa ofsetom (`2026-12-15T11:00:00+01:00`) i bez sufiksa
(`2026-12-15T12:00:00`) → **500** (`Cannot write DateTime with Kind=Local/Unspecified to
PostgreSQL type 'timestamp with time zone'`), puca u konflikt-upitu (`AnyAsync`,
`ReservationsController.cs` ~linija 342) pre upisa. Samo `...Z` radi.

System.Text.Json ponašanje: `...Z` → `Kind=Utc`; `...+01:00` → `Kind=Local` (već
preračunato u lokalnu zonu servera, pa je `ToUniversalTime()` tačan); bez zone →
`Kind=Unspecified` (dvosmisleno — ne znamo zonu).

**Izmene** u `ReservationsController.cs`:

- Dodati privatni statički helper (pored ostalih privatnih helpera u istoj klasi):
  ```csharp
  // System.Text.Json tags "...Z" as Utc and "...+01:00" as Local (already shifted
  // into the server's zone, so ToUniversalTime is exact). A value with no zone at
  // all is Unspecified and genuinely ambiguous — rejected rather than guessed.
  private static bool TryNormalizeToUtc(DateTime value, out DateTime utc)
  {
      switch (value.Kind)
      {
          case DateTimeKind.Utc:
              utc = value;
              return true;
          case DateTimeKind.Local:
              utc = value.ToUniversalTime();
              return true;
          default:
              utc = default;
              return false;
      }
  }
  ```
- U `Create` (`[HttpPost]`) i `CreateWalkIn` (`[HttpPost("walk-in")]`), **pre** poziva
  `CreateReservationCoreAsync`:
  ```csharp
  if (!TryNormalizeToUtc(request.StartsAt, out var startsAtUtc))
      return BadRequest("startsAt must include a timezone offset (e.g. \"2026-12-15T08:00:00Z\")");
  ```
  i proslediti `startsAt: startsAtUtc` umesto `request.StartsAt`.
  U `Create` stavi proveru posle razrešavanja tenanta samo ako je tako prirodnije čitljivo —
  bitno je da bude pre `CreateReservationCoreAsync`.
- Postojeći `DateTime.SpecifyKind(startsAt, DateTimeKind.Utc)` u email bloku ostaje (bezopasan).
  Ne menjaj ni njegov komentar osim ako postane netačan — ako misliš da jeste, pitaj Petra.

**Provera** (posle build + docker rebuild). Za OBA endpointa (`/reservations` javni sa
`"tenantSlug":"dev-wash"`, i `/reservations/walk-in` sa owner tokenom):

| `startsAt` (public) | `startsAt` (walk-in) | Očekivano HTTP | Očekivano u bazi (UTC) |
|---|---|---|---|
| `2026-12-15T08:00:00Z` | `2026-12-15T14:00:00Z` | 201 | `08:00+00` / `14:00+00` |
| `2026-12-15T11:00:00+01:00` | `2026-12-15T17:00:00+01:00` | **201** | **`10:00+00`** / **`16:00+00`** |
| `2026-12-15T12:00:00` | `2026-12-15T18:00:00` | **400** | — |

Public body:
```json
{"tenantSlug":"dev-wash","serviceId":"<SVC>","bayId":"<BAY>","startsAt":"<T>","customerName":"P0 TEST","customerPhone":"+381600000001","customerEmail":"p0test@example.com"}
```
Walk-in body: isto bez `tenantSlug`, telefon `+381600000002`, header `Authorization: Bearer $OT`.

Proveri bazu:
```bash
docker exec washbook-postgres psql -U washbook -d washbookpro -c "set timezone='UTC'; select r.\"StartsAt\", r.\"EndsAt\", r.\"CreatedBy\" from \"Reservations\" r join \"Customers\" c on c.\"Id\"=r.\"CustomerId\" where c.\"Name\"='P0 TEST' order by r.\"StartsAt\";"
```
Dodatno: isti `+01:00` zahtev poslat drugi put mora dati **409** (konflikt radi sa normalizovanim vremenom).
Posle: čišćenje, stanje 1/3/1.

**Commit:** `fix(reservations): normalize startsAt to UTC and reject zone-less values`

---

## Gate 4 — granice dana po Beogradu u `GetReservations` i `GetStats` (P0.5)

**Zašto:** obe metode računaju dan u UTC-u:
`date.ToDateTime(00:00, Utc)` do `date.ToDateTime(23:59:59, Utc)` (i mesec u `GetStats`
analogno). Rezervacija u 00:30 po beogradskom vremenu (= 23:30Z prethodnog dana) pada pod
pogrešan dan. **Ovo još nije empirijski potvrđeno** — prvo dokaz.

**Korak 1 — dokaz bag-a (pre bilo kakve izmene koda):**
- Napravi walk-in sa `startsAt` = `2026-12-15T23:30:00Z` (= 16.12. 00:30 Beograd).
- `GET /reservations?date=2026-12-16` (owner token) — po Beogradu treba da je sadrži.
- `GET /reservations?date=2026-12-15` — po Beogradu NE treba da je sadrži.
- Nalepi izlaz. **Ako se bag ne potvrdi (16.12. je sadrži, 15.12. ne), STANI i javi Petru — gate otpada.**

**Korak 2 — ispravka** u `ReservationsController.cs` (`GetReservations` i `GetStats`):
- Koristi isti obrazac kao `GetAvailability` (~linije 76–79) i postojeće
  `private static readonly TimeZoneInfo BelgradeTimeZone`:
  ```csharp
  var dayStart = TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BelgradeTimeZone);
  var nextDayStart = TimeZoneInfo.ConvertTimeToUtc(date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BelgradeTimeZone);
  // filter: r.StartsAt >= dayStart && r.StartsAt < nextDayStart   (poluotvoren interval, ne <= 23:59:59)
  ```
- `GetStats` mesec: `monthStart` = Beograd ponoć 1. u mesecu → UTC; `nextMonthStart` = Beograd
  ponoć 1. sledećeg meseca → UTC; filter `>= monthStart && < nextMonthStart`.
- Ne menjaj šta metode vraćaju (oblik JSON-a), samo granice.

**Korak 3 — provera:**
- Ista rezervacija (23:30Z 15.12.) se sada pojavljuje pod `date=2026-12-16`, a ne pod `2026-12-15`.
- Kontrola: walk-in u `2026-12-15T14:00:00Z` i dalje pod `2026-12-15`.
- `GET /reservations/stats?date=2026-12-16` (owner) — nalepi odgovor; brojevi za dan moraju
  odgovarati rezervacijama vraćenim za taj dan.
- Čišćenje, stanje 1/3/1.

**Commit:** `fix(reservations): compute day and month boundaries in Belgrade time`

---

## Gate 5 — frontend datum i vreme po Beogradu (P0.3 + P0.4)

**Zašto:** P0.0 (node 20 u `washbook-web`, različiti `TZ`):
- `formatTime` (kopiran na 3 mesta) prikazuje vreme u zoni browsera: New York 08:00Z → "03:00" (treba 09:00).
- `WalkInDialog.tsx:81` `new Date(`${date}T${time}:00`).toISOString()` — New York 09:00 → `14:00Z` (treba `08:00Z`).
- `toISOString().split("T")[0]` vraća UTC datum — greši **i u Beogradu** posle lokalne ponoći
  (1h zimi, 2h leti terminal/dashboard prikazuju juče).

**Izmene:**

1. `web/lib/date-format.ts` (postojeći fajl — **ne praviti novi fajl**; ne dodavati biblioteke).
   Dodati konstantu i helpere, sa kratkim komentarima u stilu postojećeg fajla:
   ```ts
   const BELGRADE_TZ = "Europe/Belgrade";

   // "09:00" for an ISO instant, in Belgrade regardless of the viewer's zone.
   export function formatTimeSr(iso: string): string {
       return new Date(iso).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit", timeZone: BELGRADE_TZ });
   }

   // YYYY-MM-DD of the Belgrade calendar day containing `instant`.
   export function belgradeDateString(instant: Date): string {
       // en-CA formats as YYYY-MM-DD
       return instant.toLocaleDateString("en-CA", { timeZone: BELGRADE_TZ });
   }

   // Belgrade wall-clock "HH:mm" (24h) of `instant`.
   export function belgradeTimeString(instant: Date): string {
       return instant.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: BELGRADE_TZ });
   }

   // Belgrade wall-clock date + time → UTC ISO string, independent of the browser zone.
   export function belgradeWallTimeToUtcIso(date: string, time: string): string { ... }
   ```
   Implementacija `belgradeWallTimeToUtcIso`: neka `guess = Date.UTC(y, m-1, d, hh, mm)`;
   izračunaj ofset Beograda u tom trenutku preko `Intl.DateTimeFormat("en-US", { timeZone: BELGRADE_TZ,
   hourCycle: "h23", year/month/day/hour/minute/second: "numeric"/"2-digit" }).formatToParts(new Date(guess))`
   → sastavi `Date.UTC(...)` od delova → `offset = thatUtc - guess`; `result = guess - offset`;
   ponovi računanje ofseta za `result` i ako se razlikuje (DST prelaz) koristi novi ofset.
   Vrati `new Date(result).toISOString()`.
   **Prvo verifikuj `en-CA` i `en-GB`/`h23` izlaz u node-u** (vidi proveru) — ako format nije
   tačno `YYYY-MM-DD` / `HH:mm`, koristi `formatToParts` umesto toga.

2. Zamene (svuda ukloniti lokalnu funkciju i importovati iz `@/lib/date-format`):

   | Fajl | Izmena |
   |---|---|
   | `web/app/book/[slug]/DateTimeStep.tsx` | lokalni `formatTime` → `formatTimeSr` |
   | `web/app/book/[slug]/ConfirmationStep.tsx` | lokalni `formatTime` → `formatTimeSr` |
   | `web/app/terminal/[slug]/ReservationCard.tsx` | lokalni `formatTime` → `formatTimeSr` |
   | `web/app/terminal/[slug]/TerminalView.tsx:32` | `new Date().toISOString().split("T")[0]` → `belgradeDateString(new Date())` |
   | `web/app/terminal/[slug]/WalkInDialog.tsx:30` | `localDate` → `belgradeDateString(now)` |
   | `web/app/terminal/[slug]/WalkInDialog.tsx:31–32` | `roundedTime` iz `belgradeTimeString(now)` (sat + zaokruživanje minuta na :00/:30, ista logika kao sada) umesto `now.getHours()/getMinutes()` |
   | `web/app/terminal/[slug]/WalkInDialog.tsx:81` | `startsAt: belgradeWallTimeToUtcIso(form.date, form.time)` |
   | `web/app/(dashboard)/dashboard/reservations/ReservationsView.tsx:8–9` | lokalni `toDateString` → `belgradeDateString` |
   | `web/app/(dashboard)/dashboard/stats/StatsView.tsx:6–7` | lokalni `toDateString` → `belgradeDateString` |
   | `web/app/(dashboard)/dashboard/stats/StatsView.tsx:~58` | `date.toLocaleDateString("sr-Latn-RS", {...})` — dodati `timeZone: "Europe/Belgrade"` |

   **NE dirati** `toLocalDateString` / `parseLocalDateString` u `DateTimeStep.tsx` — rade sa
   datumima iz kalendara (lokalna ponoć), ne sa trenucima, i ispravni su.
   **NE dirati** `success/page.tsx` i `AddToCalendarButton.tsx` — već koriste eksplicitni `Europe/Belgrade`.
   Stilovi: samo `--wb-*` tokeni (ovde se stil ne menja).

**Provera:**

1. `cd web && pnpm exec tsc --noEmit` → bez grešaka (nalepi izlaz).
2. `cd web && pnpm lint` → nalepi izlaz (prijavi samo nove greške u izmenjenim fajlovima).
3. Zone test: napravi node skriptu sa **doslovnom kopijom** novih helpera (JS verzija) i pokreni u
   `washbook-web` za `TZ` = `Europe/Belgrade`, `America/New_York`, `Asia/Tokyo`, `UTC`.
   U SVIM zonama mora biti isti rezultat:
   - `formatTimeSr("2026-12-15T08:00:00Z")` → `09:00`
   - `belgradeDateString(new Date("2026-12-15T23:30:00Z"))` → `2026-12-16`
   - `belgradeTimeString(new Date("2026-12-15T23:30:00Z"))` → `00:30`
   - `belgradeWallTimeToUtcIso("2026-12-15","09:00")` → `2026-12-15T08:00:00.000Z` (zima, +01)
   - `belgradeWallTimeToUtcIso("2026-07-15","09:00")` → `2026-07-15T07:00:00.000Z` (leto, +02)
   - DST: `belgradeWallTimeToUtcIso("2026-03-29","03:30")` → `2026-03-29T01:30:00.000Z`
     (29.3.2026. je prelazak na letnje vreme u 02:00 → 03:00)
4. Rebuild web: `cd infra && docker compose up --build -d web`.
5. Živi test terminala: uloguj se kao worker na `http://localhost:3000`, otvori `/terminal/dev-wash`,
   napravi walk-in za 2026-12-15 u 09:00 (ime `P0 TEST`, email `p0test@example.com`) →
   u bazi mora biti `StartsAt = 2026-12-15 08:00:00+00`, a kartica mora prikazati `09:00`.
   (Ako browser automatizacija nije dostupna, zamoli Petra da to uradi ručno i nalepi SQL proveru.)
6. Čišćenje, stanje 1/3/1.

**Commit:** `fix(web): format and send dates and times in Belgrade time`

---

## Posle svih gate-ova

- Predloži ažuriranje `docs/PROJECT_STATE.md`: P0 završen (sa commit hash-ovima), aktivan P1.
  Sačekaj odobrenje.
- U P4 (ADR dokumentacija) zabeleži kandidata za ADR: "API ugovor: `startsAt` mora sadržati
  zonu; vrednost bez zone → 400" i "staff registracija uklonjena do Faze 3 onboardinga".
- Obriši ovaj fajl (`docs/P0-PLAN.md`) u istom commitu kao ažuriranje PROJECT_STATE.
- Ne počinji P1 bez Petrovog naloga.

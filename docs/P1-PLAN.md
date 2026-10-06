# P1-PLAN.md — plan za P1: determinizam dev okruženja

**Napravljeno:** 2026-10-06. **Status:** odobren od strane Petra, nije započet.
Privremeni fajl — kada se P1 završi, obrisati ga u istom commitu kao ažuriranje
`docs/PROJECT_STATE.md`.

**Cilj P1:** da sveže dev okruženje (`docker compose down -v` + `up --build`) uvek
izgleda isto — isti ID-jevi usluga, boksa i korisnika, seed koji pouzdano prođe iz
prvog pokušaja — i da se razjasni "null render" problem iz ranijeg planiranja.

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`. Ukratko:

- **Gate po gate.** Posle svakog gate-a STANI: pokaži pun sadržaj svakog izmenjenog
  fajla (kao tekst u odgovoru, ne samo tool poziv), izlaz build-a i doslovan izlaz
  provere. Čekaj Petrovo odobrenje.
- **Jedan commit po gate-u koji menja kod**, tek posle odobrenja. Conventional Commits,
  jednolinijski `git commit -m "..."`, **bez AI atribucije**. Nema push-a.
- **Ne radi ništa van ovog plana.** Uočeni problemi van plana (stil, uvlaka, drugi bagovi)
  se prijavljuju, ne popravljaju.
- **Ne pretpostavljaj — dokaži.** Nalepi pravi izlaz komandi i logova.
- **Gate 0 i Gate 1 su samo istraživanje** — ne menjaju kod.
- Razgovor sa Petrom na srpskom (latinica). Kod i identifikatori na engleskom.

---

## Okruženje i zamke

- Docker je kanonski: komande iz `/infra/`. Backend `http://localhost:8080`, web `:3000`.
  **Nikad** `dotnet run` na 5033.
- Kontejneri: `washbook-backend`, `washbook-web`, `washbook-postgres`, `washbook-pgadmin`.
- Baza: `docker exec washbook-postgres psql -U washbook -d washbookpro -c '...'`
  - heredoc ne radi bez `docker exec -i`; koristi više `-c` argumenata, `-1`, `-v ON_ERROR_STOP=1`
  - stringovi u SQL-u unutar bash single quote-a: `$$tekst$$`
- `jq` nije instaliran. JWT: `sed -E 's/.*"accessToken":"([^"]+)".*/\1/'`.
- Git Bash na Windows-u prepisuje putanje koje počinju sa `/` u argumentima za docker —
  koristi `MSYS_NO_PATHCONV=1` kad prosleđuješ putanje unutar kontejnera.
- Backend logovi: `docker logs washbook-backend 2>&1 | grep -iE "seed|migrat|fail|exception"`.
- Backup i privremeni fajlovi idu u scratchpad direktorijum sesije, **nikad u repo**.

### Kako seed trenutno radi (stanje na commitu `52c4c01`)

- `Program.cs` (~linije 92–122), samo u `Development`:
  1. `db.Database.MigrateAsync()` (greška → throw)
  2. u **jednom** `try`: `ReservationSeed.SeedAsync(db, devTenantId)` pa
     `DevDataSeed.SeedAsync(db, devTenantId, isDevelopment: true)`;
     greška → `LogWarning("Dev seed failed; continuing startup without seed.")` i aplikacija
     nastavlja. **Ako `ReservationSeed` baci izuzetak, `DevDataSeed` se uopšte ne pozove.**
- `devTenantId` dolazi iz `appsettings.Development.json` → `"DevTenantId": "80b059d6-c10f-47a6-8296-797009d5aa3d"`.
- `backend/src/WashBookPro.Api/Modules/Reservations/Data/ReservationSeed.cs` — 6 usluga, svaka
  `Id = Guid.NewGuid()`; preskače ako tenant već ima bilo koju uslugu.
- `backend/src/WashBookPro.Api/Common/Persistence/DevDataSeed.cs` — tenant (fiksni ID iz config-a),
  owner i worker (`Guid.NewGuid()`), "Bay 1" (`Guid.NewGuid()`), dopuna kontakt polja tenanta.
  Svaki korak je idempotentan (proveri pa preskoči).
- Nema FK ograničenja sa `Services`/`Bays`/`Users` na `Tenants` (provereno u `pg_constraint`),
  pa redosled seed-ova ne puca na FK.
- `CLAUDE.md` "Known Gotchas" trenutno kaže: (a) ID-jevi usluga i boksova se menjaju posle
  `down -v`; (b) ako je `Users` prazna posle `up --build -d`, uradi `docker compose restart backend`.
  P1 treba da ukloni uzrok obe stavke.

---

## Gate 0 — istraživanje "null render" problema (samo izveštaj)

**Kontekst:** u ranijem planiranju P1 je opisan kao "GUID seeding, **null render fix**".
Niko se ne seća tačno na šta se "null render" odnosio. Jedini trag u kodu je
zakomentarisan stari scaffold u `web/app/(dashboard)/dashboard/page.tsx` (`if (!data) return null;`) —
to je mrtav kod i verovatno NIJE to.

**Zadatak:** pronađi kandidate i prijavi ih — **ništa ne popravljaj**.

1. Pretraži `web/app` i `web/components` za komponente koje mogu prikazati prazan ekran:
   - `return null` (ne-zakomentarisano), uslovi tipa `if (!x) return null`
   - renderovanje dok se podaci učitavaju bez loading stanja
   - `.map` nad poljem koje može biti `undefined`/`null` iz API-ja
   - mesta gde se prikazuje `null`/`undefined` kao tekst
2. Fokus na stranicama koje zavise od dev podataka: `/terminal/dev-wash`, `/dashboard/*`,
   `/book/dev-wash`, `/profil`.
3. Uživo: uz pokrenut Docker otvori te stranice (browser automatizacija ako je dostupna,
   inače zamoli Petra) kao owner, worker i bez prijave. Zabeleži prazan ekran, grešku u
   konzoli ili "null"/"undefined" u UI-ju.
4. Posebno proveri ponašanje kad baza ima **0 rezervacija** i **0 usluga** za dan/tenant
   (to se dešava odmah posle `down -v`) — ovo je najverovatnija veza sa "dev determinizmom".

**Izlaz:** lista kandidata (fajl:linija, šta se vidi, kako reprodukovati, dokaz).
Petar odlučuje šta se popravlja i da li je to deo P1. **Nema commita u ovom gate-u.**

---

## Gate 1 — backup i reprodukcija svežeg starta (pre izmene koda)

**Cilj:** dokazati kako se okruženje ponaša od nule *pre* izmena — posebno gotcha
"Users prazna posle `up --build`".

**Odobreno od Petra:** `docker compose down -v` (briše dev bazu), uz backup pre toga.

1. Stanje pre: nalepi
   ```bash
   docker exec washbook-postgres psql -U washbook -d washbookpro \
     -c 'select (select count(*) from "Tenants") t, (select count(*) from "Users") u, (select count(*) from "Services") s, (select count(*) from "Bays") b, (select count(*) from "Reservations") r, (select count(*) from "CustomerAccounts") ca;'
   ```
2. Backup (u scratchpad, ne u repo):
   ```bash
   docker exec washbook-postgres pg_dump -U washbook -d washbookpro -Fc -f /tmp/p1_backup.dump
   MSYS_NO_PATHCONV=1 docker cp washbook-postgres:/tmp/p1_backup.dump "<scratchpad>/p1_backup.dump"
   ```
   Potvrdi veličinu fajla (`ls -la`). Ako backup ne uspe — STANI.
3. Reset i start:
   ```bash
   cd infra && docker compose down -v && docker compose up --build -d
   ```
4. Sačekaj da backend bude spreman (poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health`
   do 200, max ~2 min — ne `sleep` naslepo).
5. Nalepi: backend logove (seed/migracije/izuzeci), brojeve iz koraka 1, i
   `select "Id","Name" from "Services";`, `select "Id","Name" from "Bays";`, `select "Id","Email","Role" from "Users";`.
6. Proveri login: `POST /auth/login` za `owner@devwash.local` / `Owner123!` → 200?
7. Ponovi korake 3–6 **još jednom** (drugi `down -v` + `up --build`) i uporedi:
   - da li su ID-jevi usluga/boksa/korisnika različiti između dva starta (očekivano: da — to je bag)
   - da li je `Users` bio prazan bar jednom; ako jeste, nalepi tačan izuzetak iz loga.

**Izlaz:** izveštaj — da li se "Users prazna" reprodukuje, i ako da, tačan uzrok iz logova.
**Ne popravljaj ništa.** Ako se "Users prazna" reprodukuje, predloži ispravku (vidi Gate 3)
i čekaj odobrenje. **Nema commita.**

---

## Gate 2 — fiksni (deterministički) ID-jevi u dev seed-u

**Izmene:**

1. `backend/src/WashBookPro.Api/Modules/Reservations/Data/ReservationSeed.cs` — svaka usluga
   dobija fiksni ID umesto `Guid.NewGuid()`:

   | Usluga | ID |
   |---|---|
   | Automobil — obično pranje | `5e000000-0000-4000-8000-000000000001` |
   | Automobil — dubinsko pranje | `5e000000-0000-4000-8000-000000000002` |
   | SUV — obično pranje | `5e000000-0000-4000-8000-000000000003` |
   | SUV — dubinsko pranje | `5e000000-0000-4000-8000-000000000004` |
   | Kombi — obično pranje | `5e000000-0000-4000-8000-000000000005` |
   | Kombi — dubinsko pranje | `5e000000-0000-4000-8000-000000000006` |

2. `backend/src/WashBookPro.Api/Common/Persistence/DevDataSeed.cs`:

   | Entitet | ID |
   |---|---|
   | Bay 1 | `b0000000-0000-4000-8000-000000000001` |
   | owner@devwash.local | `a0000000-0000-4000-8000-000000000001` |
   | worker@devwash.local | `a0000000-0000-4000-8000-000000000002` |

   Tenant već ima fiksni ID iz config-a — ne dirati.

3. Oblik: ID-jeve drži kao `private static readonly Guid` (ili `Guid.Parse("...")` inline)
   **unutar postojećih seed klasa**. Ne praviti novi fajl ni novu klasu konstanti.
   Ne menjati logiku preskakanja (idempotentnost), redosled ni ostala polja.
4. Ovo važi samo za `Development` seed. Produkcioni kod se ne dira.

**Napomena:** postojeća baza ima stare, nasumične ID-jeve i seed ih neće prepisati
(preskače ako podaci postoje). Fiksni ID-jevi važe posle `down -v`.

**Provera:**

1. `cd backend && dotnet build` → 0 errors.
2. `cd infra && docker compose down -v && docker compose up --build -d`, sačekaj `/health` 200.
3. Nalepi `select "Id","Name" from "Services" order by "Id";`, isto za `Bays` i `Users` —
   moraju biti tačno ID-jevi iz tabela gore.
4. **Determinizam:** ponovi korak 2 i 3 — ID-jevi identični.
5. **Idempotentnost:** `docker compose restart backend` (bez `down -v`) → brojevi redova isti
   (6 usluga, 1 boks, 2 korisnika, 1 tenant), bez duplikata, u logu "Dev seed completed."
6. Login owner i worker → 200. `GET /availability?...` za `dev-wash` sa uslugom
   `5e000000-0000-4000-8000-000000000005` vraća slotove (proveri tačne query parametre u
   `ReservationsController.GetAvailability` pre poziva).
7. Kratka provera web-a: `/book/dev-wash` prikazuje 6 usluga (ručno ili browser automatizacija).

**Commit:** `chore(seed): use fixed IDs for dev seed services, bay and users`

---

## Gate 3 — (uslovno) pouzdan seed iz prvog pokušaja

**Radi se SAMO ako je Gate 1 reprodukovao "Users prazna" (ili drugi neuspeh seed-a).**
Ako Gate 1 nije reprodukovao problem: preskoči ovaj gate i u izveštaju to jasno navedi
(sa brojem pokušaja), a Gate 4 predlaže uklanjanje gotcha-e samo ako je to opravdano.

1. Uzrok mora biti utvrđen iz loga (Gate 1), ne pretpostavljen.
2. Predloži ispravku Petru **pre** pisanja koda: koji fajl, koja linija, zašto to rešava
   uzrok. Moguća mesta (ne unapred izabrana): redosled/razdvajanje `try` bloka u
   `Program.cs` tako da neuspeh jednog seed-a ne preskače drugi, ili sam uzrok izuzetka.
   **Ne guši grešku** (CLAUDE.md: "Never silence an error detector") — npr. ne menjaj
   `LogWarning` u tiše, ne dodaj prazan `catch`.
3. Posle odobrenja: izmena, `dotnet build`, pa **tri uzastopna** `down -v` + `up --build -d`
   — svaki put `Users` = 2 i login radi, bez `restart backend`.

**Commit (ako se radi):** `fix(seed): <tačan opis uzroka>`

---

## Gate 4 — dokumentacija (predlog, pa commit posle odobrenja)

1. Predloži izmene `CLAUDE.md` → "Known Gotchas" (CLAUDE.md se menja samo uz odobrenje):
   - stavku "`ReservationSeed.cs` uses `Guid.NewGuid()` — Service and Bay IDs change..." zameni
     informacijom o fiksnim dev ID-jevima (gde su definisani, da važe posle `down -v`)
   - stavku "if the Users table is empty, run `docker compose restart backend`" ukloni **samo ako**
     je Gate 3 rešio uzrok ili Gate 1 dokazao da se ne reprodukuje; inače ostaje
   - "Dev Environment" sekcija: dodaj fiksne ID-jeve Bay 1 i jedne usluge (korisno za curl testove)
2. Predloži ažuriranje `docs/PROJECT_STATE.md`: P1 završen (commit hash-ovi), nalazi Gate 0
   (šta je "null render" bio i šta je odlučeno), aktivan P2 ("ne počinje bez Petrovog naloga").
3. Obriši `docs/P1-PLAN.md` u istom commitu.
4. Pokaži pune izmenjene fajlove, čekaj odobrenje.

**Commit:** `docs: close P1 and update project state`

---

## Posle P1

- Backup iz Gate 1 (`p1_backup.dump`) ostaje u scratchpad-u; ne vraća se automatski.
  Ako Petar želi stare podatke nazad, to je zaseban korak (`pg_restore`) uz njegovo odobrenje.
- Ne počinji P2 bez Petrovog naloga.

# ADR-025 — Migracije baze i dev seed pri startu backend-a

**Status:** Prihvaćeno
**Datum:** 2026-05-08
**Autor:** Petar Bogdanović

## Kontekst

Backend se posle `docker compose down -v` + `up --build` rušio sa
`Npgsql.PostgresException: 42703: column t.Address does not exist`.
Schema u Postgres volume-u zaostajao je za kodom — migracija
`AddTenantContactFields` postojala je u kodu, ali nikada nije primenjena
na tu instancu baze. `DevDataSeed.SeedTenantContactFieldsAsync` čita
nove kolone, query padne, exception propagira do `Program.Main`,
proces izađe, kontejner gasi.

Dijagnoza je otkrila i drugi, dublji problem koji je do sada bio
maskiran: postojeći seed kod **ne kreira** dev-wash tenant — samo ga
ažurira ako već postoji. Posle svakog volume reset-a baza je bila u
slomljenom stanju (0 tenanta, 1 user sa orphan TenantId, 6 services
sa orphan TenantId, 0 bays). Workaround do sada bio je ručno ubacivanje
tenant-a i bay-eva preko pgAdmin-a posle svakog reset-a — chronic
friction tačka koja se ponavljala u svakom razvojnom ciklusu.

Kod takođe nije imao centralnu strategiju za pokretanje migracija.
Pretpostavka je bila da developer ručno radi `dotnet ef database
update`, što se zaboravlja i ne preživljava volume reset.

## Odluka

Tri povezane odluke, sve fokusirane isključivo na Development okruženje:

### 1. `MigrateAsync()` na startu — samo u Development

Backend pri startu poziva `db.Database.MigrateAsync()` unutar
`if (app.Environment.IsDevelopment())` bloka. U produkciji se ovo **ne**
izvršava. Migracija pada glasno (log error + re-throw) — bez schema-e
backend nema smisla.

### 2. `DevDataSeed` self-bootstrap-uje ceo dev environment

Seed više nije samo "update if exists" — kreira sve što treba kad
nedostaje:

- **Tenant** dev-wash sa adresom, radnim vremenom, slug-om
- **Owner nalog** `owner@devwash.local` / `Owner123!`
- **Worker nalog** `worker@devwash.local` / `Worker123!`
- **Bay** ("Bay 1", IsActive=true)
- Postojeći `ReservationSeed` i dalje seed-uje 6 services
- `SeedTenantContactFieldsAsync` ostaje kao "self-heal" za stare baze
  koje imaju tenant bez novih polja

Lozinke su hardcoded u source kodu — to je svrha dev seed-a. Bezbednost
je obezbeđena kroz dva sloja: env gate u `Program.cs` i defense-in-depth
guard u samoj `SeedAsync` metodi (`InvalidOperationException` ako se
pozove van Development-a).

### 3. Migracija puca, seed ne ruši backend

Migracija je u svom `try/catch` bloku sa `LogError` + `throw`. Ako
schema ne može da se primeni, backend mora da padne — bez tabela ne
radi ništa.

Seed je u **zasebnom** `try/catch` bloku sa `LogWarning` i **bez
re-throw-a**. Ako seed padne (FK violation, duplikat, šta god), backend
i dalje radi. Dev seed je convenience, ne kritičan put.

## Posledice

### Pozitivne

- `docker compose down -v && up --build` daje potpuno funkcionalan
  dev environment u jednom potezu, bez ručnih SQL komandi
- Volume drift problem rešen — restart uvek aktuelizuje schema-u
- Friction tačka koja se ponavljala u svakom razvojnom ciklusu
  je eliminisana
- Login credencijale su deterministički — nema više "koji owner email
  sam ja kreirao prošli put"
- Buduća integration testiranja mogu pretpostaviti da fresh DB daje
  radnu app

### Negativne / kompromisi

- `Program.cs` ima više startup logike — `using` blok sa scope-om,
  migrate, seed, logger
- Hardcoded dev lozinke su u source kodu (i u git istoriji). Mitigacija:
  email-ovi koriste `.local` TLD koji se ne može registrovati javno;
  env gate + guard sprečavaju izvršavanje van Development-a
- Auto-migrate na startu je **anti-pattern u produkciji**. Ova odluka
  eksplicitno zaobilazi taj problem env gate-om, ali znači da kad
  budemo deploy-ovali, moramo zasebno rešiti production migracioni flow
  (videti "Otvorena pitanja")

### Migracije u produkciji — eksplicitno NIJE u scope-u ovog ADR-a

Production migracije se **ne** pokreću pri startu backend-a. Razlog:
multi-instance deploy → race conditions kad svaka instanca pokušava
da migrira paralelno → schema mismatch tokom rolling deploy-a → DDL
lock-ovi blokiraju saobraćaj.

Production migracioni flow je odložen do prvog realnog deploy-a
(Faza 3 — SaaS readiness). Mogući pravci za tu odluku: `dotnet ef
migrations bundle` kao deploy artifact, eksplicitan migrate step u CI
pipeline-u pre release-a, ili odvojen `migrate` Kubernetes Job pre
backend rollout-a.

## Razmotrene alternative

**Migrate na startu i u prod-u (kako je Claude Code prvobitno predložio).**
Odbačeno. Race conditions u multi-instance deploy-u. Migracija je
deploy concern, ne runtime concern.

**Custom `IDevDataSeeder` servis registrovan u DI sa zasebnim
implementacijama po environment-u.** Over-engineering za dev convenience.
Statička metoda sa env guard-om je dovoljna, jednostavnija, i sva
logika je na jednom mestu.

**Ostaviti ručne SQL inserte posle volume reset-a.** To je upravo
ono što smo eliminisali — chronic friction tačka koja je producirala
zaboravljene korake i nekonzistentno dev stanje između mašina.

**Demo rezervacije u dev seed-u.** Razmatrano i odloženo. Trenutno
6 services + tenant + 2 user-a + 1 bay je dovoljno za sve flow-ove.
Ako se ispostavi da su demo rezervacije korisne za screenshot/demo
svrhe ili E2E test setup, dodaće se u zasebnom ADR-u.

## Otvorena pitanja za kasnije

- **Production migracioni flow** — odluka u Fazi 3 kad imamo prvi
  realni deploy. Verovatno `dotnet ef migrations bundle` u CI
  pipeline-u pre release-a, ali finalni izbor zavisi od deploy
  target-a (VPS, Kubernetes, managed PaaS — još neodlučeno)
- **Demo rezervacije u seed-u** — razmotriti ako se pokaže da su
  korisne za demo perioniča potencijalnim tenant-ima
- **Seed verzionisanje** — trenutno seed je idempotentan kroz
  "if exists" provere. Ako sutra trebamo migracije seed podataka
  (npr. izmena services), trebaće strategija (verovatno odvojene
  data-only migracije)

## Reference

- Commit `188cd8c` — implementacija
- ADR-024 — razdvajanje ruta za rezervacije (kontekst za dev testing
  workflow koji je motivisao ovaj fix)
- `backend/src/WashBookPro.Api/Program.cs` — startup logika
- `backend/src/WashBookPro.Api/Common/Persistence/DevDataSeed.cs` —
  seed implementacija
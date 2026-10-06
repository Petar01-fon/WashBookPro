# ADR-027 — Test strategija: integracioni testovi nad pravim Postgres-om

**Status:** Predloženo
**Datum:** 2026-10-07
**Autor:** Petar Bogdanović

## Kontekst

Backend do sada nije imao nijedan automatski test. Ponašanje availability
algoritma i kreiranja rezervacije (201 / 400 / 404 / 409 / 401, `emailSent`,
buffer, vremenska zona, same-day cutoff) proveravano je samo ručno, kroz curl
i browser. `Cannot write DateTime with Kind=Local/Unspecified` pri upisu u
`timestamptz` je primer bagova koji se pojavljuju samo sa pravom Postgres
bazom. 409 umesto 404 za nepostojeću uslugu i boks bio je bag u logici
kontrolera koji se takođe proveravao samo ručno.

Faza M2 (radno vreme po danima, blokada boksa, cena na rezervaciji) menjaće
upravo te algoritme, pa su im potrebni testovi pre izmene.

T1 (`docs/T1-PLAN.md`) uvodi prvi test projekat,
`backend/tests/WashBookPro.Api.Tests`, sa 35 testova: 2 smoke, 12 za
availability i 21 za kreiranje rezervacije i walk-in. Ovaj ADR beleži
strategiju koja stoji iza tog projekta.

## Odluka

### 1. Integracioni testovi kroz HTTP pipeline

Testovi idu kroz `WebApplicationFactory<Program>`, pa prolaze isti
middleware, autentifikaciju, routing i EF Core kao produkcija. Privatne
metode kontrolera se ne testiraju direktno.

### 2. Pravi PostgreSQL u kontejneru

Testcontainers pokreće `postgres:16-alpine`, istu sliku kao
`infra/docker-compose.yml`. Jedan kontejner po test run-u, deljen kroz
`ICollectionFixture<PostgresFixture>` (kolekcija `Api`). Migracije primenjuje
fixture (`MigrateAsync`), jer okruženje `Testing` ne pokreće migracije iz
`Program.cs`.

### 3. Izolacija podataka: novi tenant po testu

Svaki test pravi svoj tenant sa jedinstvenim slug-om, zatim boksove, usluge i
korisnike kroz `TestData`. Testovi ne koriste dev-wash ni fiksne dev ID-jeve.
Svako čitanje iz baze u testu ide sa `IgnoreQueryFilters()`, jer scope van
HTTP zahteva nema tenant.

### 4. Okruženje `Testing` i lažni email

Okruženje je `Testing`, pa `Program.cs` ne pokreće dev seed i ne učitava
`appsettings.Development.json`. Konfiguracija se zadaje sa `UseSetting`.
`IEmailService` se zamenjuje `FakeEmailService`-om, pa testovi nikad ne šalju
pravi email.

### 5. Bez lažiranja sata

Testovi koriste pravi sat. Same-day cutoff (test A8) računa datum po
beogradskom vremenu i preskače se (`Assert.Skip`) u prozorima 00:00–00:02 i
23:00–24:00: u prvom server može da vidi drugi dan, a u drugom možda više nema
mesta za termin. `TimeProvider` se ne uvodi, jer bi menjao
produkcioni kod.

### 6. Pokretanje: `global.json` i Microsoft.Testing.Platform

`backend/global.json` sadrži `"test": { "runner": "Microsoft.Testing.Platform" }`.
Razlog: .NET 10 SDK više ne pušta xUnit v3 kroz VSTest target. Bez ovog fajla
`dotnet test` pada sa greškom *"Testing with VSTest target is no longer
supported by Microsoft.Testing.Platform on .NET 10 SDK and later"*. Fajl je u
repou, pa lokalni run i CI koriste isti runner. Komanda je `dotnet test` iz
`backend/`, i ona traži Docker.

## Razlozi i razmotrene alternative

**EF Core InMemory ili SQLite.** Odbačeno. Ne proveravaju Postgres ponašanje:
`timestamptz`, `DateTimeKind`, upite sa `IgnoreQueryFilters`. P0 bagovi bili
su upravo takvi, pa bi InMemory test prošao tamo gde produkcija pada.

**Unit testovi privatnih metoda availability algoritma.** Odbačeno za sada.
Metode su `private static` u `ReservationsController`-u, pa bi testiranje
zahtevalo izdvajanje u poseban servis, a to je promena produkcionog koda van
T1. Vidi otvoreno pitanje ispod.

**`TimeProvider` za cutoff.** Odloženo. Zahteva da `DateTime.UtcNow` u kodu
postane injektovan sat. Umesto toga, cutoff test radi sa pravim satom i
preskače se u kritičnom prozoru.

**Kontejner po test klasi ili po testu.** Odbačeno. Sporo, a izolacija kroz
novi tenant daje istu garanciju.

**Respawn ili brisanje tabela između testova.** Odbačeno. Izolacija kroz novi
tenant bez brisanja daje istu garanciju i ostavlja prostor za paralelizaciju.

**VSTest runner (bez `global.json`).** Odbačeno. .NET 10 SDK ga ne podržava za
xUnit v3.

## Posledice

### Pozitivne

- Regresiona mreža za availability i kreiranje rezervacije. M2 može da menja
  te algoritme uz zelene testove.
- Ako se P0 ili P2 bagovi vrate, testovi C7–C14 i A-serija bi ih uhvatili.
- Isti Postgres (`postgres:16-alpine`) kao u `infra/`, pa nema razlike između
  testa i produkcije na nivou baze.

### Negativne / kompromisi

- Testovi traže Docker lokalno i u CI-ju. Na Windows-u Docker Desktop mora da
  radi pre `dotnet test`.
- Sporiji su od unit testova: 35 testova traje oko 10–12 s, uz start
  kontejnera.
- Svaki novi entitet po tenantu mora da se doda u `TestData`, inače test ne
  može da ga napravi.
- `global.json` vezuje testove za ponašanje .NET 10 SDK-a. Pri promeni verzije
  SDK-a treba proveriti ovaj fajl.
- Test A8 zavisi od sata i preskače se oko ponoći, pa cutoff nije pokriven
  100% vremena.

## Otvorena pitanja

- **Frontend testovi.** Ne postoje. Ovaj ADR važi samo za backend. Strategija
  za `web/` nije odlučena.
- **Izdvajanje availability algoritma u servis.** Kad dođe radno vreme po
  danima (M2), treba odlučiti da li se algoritam izdvaja iz kontrolera, da bi
  se mogao unit-testirati.
- **Race condition.** Dva istovremena POST-a na isti termin nisu pokrivena
  testom. Treba testirati posle odluke o zaključavanju ili unique indeksu.
- **Ostali endpointi.** `GET /reservations`, `PATCH .../status`, `DELETE`,
  statistika, auth, customer auth, usluge i boksovi nemaju testove. Dodaju se
  uz feature koji ih menja.

## Reference

- Commit-i: `d6df79e` (Gate 1: projekat, fixture, smoke test, `global.json`),
  `34d54d6` (Gate 2: availability), `5cffb47` (Gate 3: kreiranje rezervacije i
  konflikti)
- `docs/T1-PLAN.md` (obrisan u commit-u zatvaranja T1)
- `docs/PROJECT_STATE.md`, sekcija "T1 — test projekat"
- `backend/global.json`
- `.github/workflows/ci.yml`: CI niz `dotnet restore`, `dotnet build --no-restore -c Release`,
  `dotnet test --no-build -c Release`
- ADR-025: migracije i dev seed (okruženje `Testing` i migracije u fixture-u)
- ADR-026: pravac proizvoda (T1 je deo M1)

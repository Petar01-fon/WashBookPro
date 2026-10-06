# T1-PLAN.md — plan za T1: test projekat (xUnit + Testcontainers/Postgres)

**Napravljeno:** 2026-10-06. **Status:** čeka Petrovo odobrenje, nije započet.
Privremeni fajl: kad se T1 završi, obriši ga u istom commitu kao ažuriranje
`docs/PROJECT_STATE.md` (isto kao `P2-PLAN.md`).

Plan je pisan za agenta koji ga izvršava korak po korak. Sve što ovde nije
navedeno — **ne radiš**. Kad nešto ne ide po planu, **staneš i prijaviš**,
ne improvizuješ.

---

## Cilj T1

Backend dobija prvi automatski test projekat. Testovi idu kroz pravi HTTP
pipeline (`WebApplicationFactory`) nad pravim PostgreSQL-om u kontejneru
(Testcontainers), i zaključavaju ponašanje koje je do sada provereno samo
ručno:

1. **Availability** (`GET /availability`): slobodni prozori po boksu,
   simetrični ±15 min buffer, radno vreme tenanta u beogradskom vremenu
   (zima i leto), same-day cutoff od 30 minuta.
2. **Kreiranje rezervacije** (`POST /reservations`, `POST /reservations/walk-in`):
   201 / 404 / 409 / 400 / 401 ishodi iz P0 i P2, i `emailSent`.

Testovi **opisuju postojeće ponašanje**. T1 ne menja produkcioni kod (jedini
izuzetak je opisan u Gate 1, korak 4).

## Odluke koje su već donete (ne menjati)

- xUnit + Testcontainers (Postgres) — odluka iz `PROJECT_STATE.md` ("Testovi").
- Putanja: `backend/tests/WashBookPro.Api.Tests` (iz M1 opisa T1).
- Prvo availability i konflikti; ostali endpointi nisu deo T1.
- **Bez lažiranja sata.** Same-day cutoff se testira sa pravim vremenom
  (vidi test A8). Ne uvodi `TimeProvider`, ne menjaj `DateTime.UtcNow` u kodu.
- "Locked Decisions" iz `CLAUDE.md` važe i za testove: kreiranje rezervacije
  **namerno nema buffer** (test C4 to zaključava), enum-i se serijalizuju
  kao **int**.

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`.

- **Gate po gate.** Posle svakog gate-a STANI. U odgovoru pokaži, kao tekst:
  pun sadržaj svakog novog ili izmenjenog fajla, doslovan izlaz
  `dotnet build` i `dotnet test`. Čekaj Petrovo odobrenje pre sledećeg gate-a.
- **Commit** tek posle odobrenja, jedan po gate-u, tačno poruka navedena u
  gate-u. Jednolinijski `git commit -m "..."`, **bez AI atribucije** (bez
  `Co-Authored-By`, bez "Generated with"). **Nema push-a.**
- **Ne menjaj produkcioni kod** (`backend/src/**`, `web/**`, `infra/**`),
  osim izuzetka u Gate 1, korak 4.
- **Kad test padne: ne "popravljaj" ni test ni kod.** Ne menjaj očekivanu
  vrednost da bi test prošao. Stani i prijavi: ime testa, očekivano, dobijeno,
  i šta misliš zašto. Očekivane vrednosti u ovom planu su izračunate iz koda
  (`ReservationsController.cs`); ako se razlikuju od stvarnog ponašanja, to je
  nalaz koji Petar mora da vidi (možda bag u kodu, možda greška u planu).
- **Ne dodaj pakete, foldere, alate ni konvencije** koje ovde nisu navedene.
- **Ne pretpostavljaj — dokaži.** Nalepi pravi izlaz komandi.
- Razgovor sa Petrom na srpskom (latinica). Kod, identifikatori i komentari
  na engleskom.

---

## Okruženje i zamke (pročitaj pre koda)

- **Docker Desktop mora da radi** — Testcontainers pokreće `postgres:16-alpine`
  (ista slika kao `infra/docker-compose.yml`). Provera: `docker info`.
  Testovi **ne koriste** dev bazu iz `infra/` i ne diraju je.
- **Okruženje testova je `"Testing"`, ne `"Development"`.** Zbog toga
  `Program.cs` **ne** pokreće migracije ni dev seed (to radi samo u
  Development-u), i **ne** učitava `appsettings.Development.json` (u kome je
  pravi Resend ključ). Migracije pokreće test fixture (Gate 1).
- **Konfiguracija se zadaje sa `builder.UseSetting(...)`**, ne sa
  `ConfigureAppConfiguration`. `Program.cs` čita `Jwt:Secret` i
  `ConnectionStrings:Default` odmah pri registraciji servisa; vrednosti iz
  `ConfigureAppConfiguration` stižu prekasno, a `UseSetting` ne.
- **Email:** `IEmailService` se u testovima zamenjuje lažnom implementacijom
  (`FakeEmailService`). Testovi nikad ne šalju pravi email.
- **Entiteti `Bay`, `Service`, `Customer`, `Reservation` i enum
  `ReservationStatus` su u globalnom namespace-u** (nemaju `namespace`).
  `ReservationCreatedBy` je u `WashBookPro.Api.Modules.Reservations.Entities`,
  `Tenant` u `WashBookPro.Api.Modules.Tenants.Entities`, `User` u
  `WashBookPro.Api.Modules.Auth.Entities`, `AppDbContext` u
  `WashBookPro.Api.Common.Persistence`.
- **Čitanje iz baze u testu:** `AppDbContext` iz `factory.Services.CreateScope()`
  nema tenant (nema HTTP zahteva), pa global query filter vraća prazno.
  Svako čitanje u testu ide sa `.IgnoreQueryFilters()`. Ne koristi `FindAsync`
  (vidi "Known Gotchas" u `CLAUDE.md`).
- **Izolacija podataka:** svi testovi dele jednu bazu. Svaki test pravi
  **svoj** tenant (jedinstven slug), svoje boksove, usluge i korisnike.
  Nikad ne koristi dev-wash ni fiksne dev ID-jeve. Email korisnika mora biti
  jedinstven globalno (`AuthService.LoginAsync` traži korisnika po emailu
  preko svih tenanta).
- **JSON:** odgovori su camelCase. `GET /availability` vraća niz
  `{ bayId, bayName, startsAt, endsAt }`, vremena su UTC sa `Z`.
  `POST` 201 vraća `{ id, status, emailSent }`, `status` je **int**
  (0 = Pending, 1 = Confirmed, 4 = Cancelled). Login vraća `{ accessToken, ... }`.
- **Vreme u testovima:** sve vrednosti piši kao UTC (`DateTime` sa
  `DateTimeKind.Utc` ili string sa `Z`). Beograd je UTC+1 zimi, UTC+2 leti.
- **Komande** pokreći iz `backend/`: `dotnet build`, `dotnet test`.

---

## Gate 1 — projekat, fixture i smoke test

### Koraci

1. Napravi `backend/tests/WashBookPro.Api.Tests/WashBookPro.Api.Tests.csproj`
   ručno (ne preko `dotnet new` šablona):

   ```xml
   <Project Sdk="Microsoft.NET.Sdk">

     <PropertyGroup>
       <TargetFramework>net10.0</TargetFramework>
       <Nullable>enable</Nullable>
       <ImplicitUsings>enable</ImplicitUsings>
       <OutputType>Exe</OutputType>
       <IsPackable>false</IsPackable>
     </PropertyGroup>

     <ItemGroup>
       <ProjectReference Include="..\..\src\WashBookPro.Api\WashBookPro.Api.csproj" />
     </ItemGroup>

   </Project>
   ```

2. Dodaj pakete (najnovija stabilna verzija, bez prerelease) iz
   `backend/tests/WashBookPro.Api.Tests/`:

   ```
   dotnet add package Microsoft.NET.Test.Sdk
   dotnet add package xunit.v3
   dotnet add package xunit.runner.visualstudio
   dotnet add package Microsoft.AspNetCore.Mvc.Testing
   dotnet add package Testcontainers.PostgreSql
   ```

   `Microsoft.AspNetCore.Mvc.Testing` mora biti 10.x (isti major kao
   `net10.0`). U izveštaju navedi tačne verzije koje su dodate.
   Nijedan drugi paket (ni FluentAssertions, ni Respawn, ni Bogus).

3. Dodaj projekat u solution, iz `backend/`:

   ```
   dotnet sln WashBookPro.slnx add tests/WashBookPro.Api.Tests/WashBookPro.Api.Tests.csproj --solution-folder tests
   ```

   Ako komanda ne radi sa `.slnx`, stani i prijavi (ne edituj `.slnx` ručno
   bez pitanja). Očekivano stanje `WashBookPro.slnx`: pored `/src/` foldera
   postoji `/tests/` folder sa novim projektom.

4. **Jedini dozvoljeni izuzetak u produkcionom kodu:** ako build testova
   pukne sa greškom da `Program` nije dostupan (npr. `CS0122` ili
   `CS0051` za `WebApplicationFactory<Program>`), dodaj na sam kraj
   `backend/src/WashBookPro.Api/Program.cs` jednu liniju:

   ```csharp
   public partial class Program;
   ```

   Ako build prolazi bez toga, **ne dodaj je**. U izveštaju reci koji je
   slučaj.

5. Napravi fajlove:

   **`Infrastructure/PostgresFixture.cs`** — jedan kontejner i jedna
   `WebApplicationFactory` za sve testove:

   ```csharp
   using Microsoft.AspNetCore.Hosting;
   using Microsoft.AspNetCore.Mvc.Testing;
   using Microsoft.AspNetCore.TestHost;
   using Microsoft.EntityFrameworkCore;
   using Microsoft.Extensions.DependencyInjection;
   using Testcontainers.PostgreSql;
   using WashBookPro.Api.Common.Email;
   using WashBookPro.Api.Common.Persistence;

   namespace WashBookPro.Api.Tests.Infrastructure;

   public sealed class PostgresFixture : IAsyncLifetime
   {
       private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
           .WithImage("postgres:16-alpine")
           .Build();

       public WebApplicationFactory<Program> Factory { get; private set; } = null!;
       public FakeEmailService Email { get; } = new();

       public async ValueTask InitializeAsync()
       {
           await _postgres.StartAsync();

           Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
           {
               builder.UseEnvironment("Testing");
               builder.UseSetting("ConnectionStrings:Default", _postgres.GetConnectionString());
               builder.UseSetting("Jwt:Secret", TestConstants.JwtSecret);
               builder.UseSetting("Jwt:Issuer", "washbook-tests");
               builder.UseSetting("Jwt:Audience", "washbook-tests");
               builder.UseSetting("Google:ClientId", "test-client-id");
               builder.UseSetting("Google:ClientSecret", "test-client-secret");
               builder.ConfigureTestServices(services =>
               {
                   services.RemoveAll<IEmailService>();
                   services.AddSingleton<IEmailService>(Email);
               });
           });

           using var scope = Factory.Services.CreateScope();
           var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
           await db.Database.MigrateAsync();
       }

       public async ValueTask DisposeAsync()
       {
           await Factory.DisposeAsync();
           await _postgres.DisposeAsync();
       }
   }
   ```

   (`RemoveAll` je iz `Microsoft.Extensions.DependencyInjection.Extensions`;
   dodaj taj `using`.)

   **`Infrastructure/ApiCollection.cs`** — svi test klase su u jednoj
   kolekciji, dele fixture i izvršavaju se redom:

   ```csharp
   namespace WashBookPro.Api.Tests.Infrastructure;

   [CollectionDefinition(Name)]
   public sealed class ApiCollection : ICollectionFixture<PostgresFixture>
   {
       public const string Name = "Api";
   }
   ```

   **`Infrastructure/TestConstants.cs`**: `public const string JwtSecret`
   = string od najmanje 64 ASCII znaka (npr.
   `"test-only-jwt-secret-0123456789-0123456789-0123456789-0123456789"`).

   **`Infrastructure/FakeEmailService.cs`** — implementira `IEmailService`:
   - `public bool NextResult { get; set; } = true;`
   - `public bool ThrowNext { get; set; }`
   - `public List<BookingConfirmationEmail> Sent { get; } = [];`
   - `SendBookingConfirmationAsync`: ako je `ThrowNext` true → postavi ga na
     false i baci `InvalidOperationException("fake email failure")`; inače
     doda email u `Sent` i vrati `NextResult`, pa vrati `NextResult` na `true`.
   - Ovo je deljen objekat (singleton). Testovi koji menjaju `NextResult`
     ili `ThrowNext` to rade neposredno pre jednog POST-a.

   **`Infrastructure/TestData.cs`** — pomoćne metode koje upisuju direktno u
   bazu kroz `Factory.Services.CreateScope()` + `AppDbContext`:
   - `CreateTenantAsync(TimeOnly? opening = 08:00, TimeOnly? closing = 18:00)`
     → novi `Tenant` sa `Id = Guid.NewGuid()`, `Slug = "t-" + Guid.NewGuid().ToString("N")[..12]`,
     `Name = "Test " + slug`, `IsActive = true`, `CreatedAt = DateTimeOffset.UtcNow`,
     `OpeningTime`/`ClosingTime` iz parametara. Vraća tenant.
     Mora postojati način da se zada `null` za oba vremena (test A7).
   - `CreateBayAsync(Guid tenantId, string name, bool isActive = true)` → `Bay`.
   - `CreateServiceAsync(Guid tenantId, int durationMinutes, bool isActive = true)`
     → `Service` sa `Name = "Test service"`, `VehicleCategory = "Car"`,
     `ServiceType = "Basic"`, `PriceRsd = 1000`.
   - `CreateReservationAsync(Guid tenantId, Guid bayId, Guid serviceId, DateTime startsAtUtc, DateTime endsAtUtc, ReservationStatus status = ReservationStatus.Confirmed)`
     → upisuje i novog `Customer`-a (Name "Seed", Phone jedinstven) i
     `Reservation`. `EndsAt` se zadaje eksplicitno (ne računa se iz usluge),
     da testovi mogu da blokiraju ceo dan.
   - `CreateUserAsync(Guid tenantId, string role)` → `User` sa jedinstvenim
     emailom `"{role}-{guid}@tests.local"`, `PasswordHash =
     BCrypt.Net.BCrypt.HashPassword("Test123!")`, `CreatedAt = DateTimeOffset.UtcNow`.
     Vraća email.
   - `LoginAsync(HttpClient client, string email)` → `POST /auth/login` sa
     `{ email, password: "Test123!" }`, vraća `accessToken` iz odgovora.
   - `GetReservationAsync(Guid id)` → čitanje sa `.IgnoreQueryFilters()`.

   **`SmokeTests.cs`**:
   - `[Collection(ApiCollection.Name)]`, konstruktor prima `PostgresFixture`.
   - Test `Health_returns_200`: `GET /health` → 200.
   - Test `Migrations_are_applied`: `db.Database.GetPendingMigrationsAsync()`
     je prazan.

6. Proveri: iz `backend/` pokreni `dotnet build` i `dotnet test`.
   Očekivano: build bez grešaka, 2 testa prošla.

   Poznate moguće prepreke (rešavaš samo ove, kako piše; sve ostalo prijavi):
   - Upozorenje da je `new PostgreSqlBuilder()` bez argumenta zastareo
     (obsolete) → koristi `new PostgreSqlBuilder("postgres:16-alpine")` i
     ukloni `.WithImage(...)`.
   - Greška da `WebApplicationFactory` ne može da odredi content root, ili
     da Docker nije dostupan → stani i prijavi doslovnu grešku.

### Izveštaj za Gate 1

- pun sadržaj svih novih fajlova, `WashBookPro.slnx`, i `Program.cs` samo
  ako je menjan (korak 4)
- tačne verzije paketa
- doslovan izlaz `dotnet build` i `dotnet test`
- da li je korak 4 bio potreban

**Commit posle odobrenja:** `test: add API test project with Postgres test container`

---

## Gate 2 — availability testovi

Fajl: `AvailabilityTests.cs`, `[Collection(ApiCollection.Name)]`.

Zajedničko za A1–A7: datum je **u budućnosti** i fiksan, pa cutoff ne
utiče. Zimski datum je `2030-01-15` (Beograd UTC+1), letnji `2030-07-16`
(UTC+2). Zahtev:
`GET /availability?date=2030-01-15&serviceId={serviceId}&tenantSlug={slug}`.
Odgovor deserijalizuj u listu recorda
`(Guid BayId, string BayName, DateTimeOffset StartsAt, DateTimeOffset EndsAt)`
i upoređuj **UTC** vremena.

Kako su očekivane vrednosti izračunate (da bi znao da li je nalaz bag ili
greška u planu): radno vreme u Beogradu se pretvori u UTC; svaka postojeća
rezervacija se proširi za 15 min na obe strane; slobodni prozori su rupe
između tih blokova; u svakom prozoru prvi termin je početak prozora
zaokružen naviše na 5 min, sledeći je prethodni + (trajanje + 15 min),
dok god termin staje u prozor. Kad dva boksa nude isto vreme, ostaje boks
čije je ime prvo po abecedi.

| # | Test | Postavka | Očekivano |
|---|---|---|---|
| A1 | `Winter_day_full_grid` | radno vreme 08:00–18:00, 1 boks "A", usluga 30 min, bez rezervacija, `2030-01-15` | 200, tačno 13 termina: 07:00Z, 07:45Z, 08:30Z, 09:15Z, 10:00Z, 10:45Z, 11:30Z, 12:15Z, 13:00Z, 13:45Z, 14:30Z, 15:15Z, 16:00Z; svaki `endsAt` = start + 30 min; svi `bayName` = "A" |
| A2 | `Summer_day_shifts_with_dst` | isto kao A1, datum `2030-07-16` | tačno 13 termina: 06:00Z, 06:45Z, 07:30Z, 08:15Z, 09:00Z, 09:45Z, 10:30Z, 11:15Z, 12:00Z, 12:45Z, 13:30Z, 14:15Z, 15:00Z (A1 pomereno za −1 h) |
| A3 | `Reservation_blocks_with_15_min_buffer_on_both_sides` | kao A1, plus rezervacija na "A" 09:00Z–09:30Z, status Confirmed | tačno 12 termina: 07:00Z, 07:45Z, 09:45Z, 10:30Z, 11:15Z, 12:00Z, 12:45Z, 13:30Z, 14:15Z, 15:00Z, 15:45Z, 16:30Z. Nijedan termin ne počinje pre 09:45Z a završava posle 08:45Z. |
| A4 | `Cancelled_reservation_does_not_block` | kao A3, ali rezervacija ima status Cancelled | isto kao A1 (13 termina) |
| A5 | `Second_bay_offers_slots_when_first_is_full` | radno vreme 08:00–18:00, boksovi "A" i "B", usluga 30 min, rezervacija na "A" 07:00Z–17:00Z | 13 termina iz A1, svi sa `bayName` = "B" i `bayId` boksa B |
| A6 | `Tenant_opening_hours_are_used` | radno vreme 09:00–12:00, 1 boks, usluga 30 min | tačno 4 termina: 08:00Z, 08:45Z, 09:30Z, 10:15Z |
| A7 | `Missing_opening_hours_fall_back_to_08_18` | `OpeningTime` i `ClosingTime` = null, 1 boks, usluga 30 min | isto kao A1 (13 termina) |
| A8 | `Same_day_cutoff_is_30_minutes_from_now` | radno vreme 00:00–23:55, 1 boks, usluga 15 min; datum = **današnji dan u Beogradu** | vidi ispod |
| A9 | `Inactive_bay_is_ignored` | boks "A" neaktivan, boks "B" aktivan, usluga 30 min | 13 termina iz A1, svi `bayName` = "B" |
| A10 | `Unknown_tenant_returns_404` | `tenantSlug=does-not-exist` | 404 |
| A11 | `Inactive_service_returns_404` | usluga sa `isActive: false` | 404 |
| A12 | `No_active_bays_returns_empty_list` | tenant sa jednim neaktivnim boksom | 200, prazna lista |

**A8 — pravi sat, bez lažiranja:**
1. `before = DateTime.UtcNow` neposredno pre zahteva, `after = DateTime.UtcNow`
   neposredno posle.
2. Beogradsko vreme: `beforeBelgrade = TimeZoneInfo.ConvertTimeFromUtc(before, TimeZoneInfo.FindSystemTimeZoneById("Europe/Belgrade"))`;
   datum zahteva = `DateOnly.FromDateTime(beforeBelgrade)`.
3. Ako je `beforeBelgrade` u 23:00 ili kasnije, ili pre 00:02, preskoči test
   sa `Assert.Skip("too close to Belgrade midnight")` (xUnit v3). Blizu
   ponoći server može da vidi drugi dan, a posle 23:00 možda nema mesta za
   termin; van tog intervala uvek ima mesta.
4. Proveri:
   - lista **nije prazna**;
   - svaki termin počinje `>= before + 30 min`;
   - svaki termin počinje na celom 5-minutnom broju (sekunde = 0, minuti % 5 == 0);
   - prvi termin je `<= RoundUpTo5(after + 30 min)` (napiši mali helper u
     testu: zaokruživanje naviše na sledećih 5 minuta, isto kao
     `RoundUpTo5Minutes` u kontroleru).

### Izveštaj za Gate 2

- pun sadržaj `AvailabilityTests.cs` i svakog izmenjenog fajla iz `Infrastructure/`
- doslovan izlaz `dotnet test`
- za svaki pali test: očekivano, dobijeno, bez izmene testa

**Commit posle odobrenja:** `test: cover availability windows, buffer and same-day cutoff`

---

## Gate 3 — kreiranje rezervacije i konflikti

Fajl: `CreateReservationTests.cs`, `[Collection(ApiCollection.Name)]`.

Postavka za sve: tenant 08:00–18:00, boksovi "A" i "B", usluga 30 min,
datum `2030-01-15`. Telo za `POST /reservations`:

```json
{
  "tenantSlug": "<slug>",
  "serviceId": "<id>",
  "bayId": "<id>",
  "startsAt": "2030-01-15T09:00:00Z",
  "customerName": "Test Customer",
  "customerPhone": "<jedinstven, npr. 06 + 8 cifara iz Guid-a>",
  "customerEmail": "customer@tests.local"
}
```

"Postojeća" rezervacija se upisuje sa `TestData.CreateReservationAsync`
na boks "A", 09:00Z–09:30Z, status Confirmed (osim gde piše drugačije).

| # | Test | Zahtev | Očekivano |
|---|---|---|---|
| C1 | `Free_slot_returns_201_pending_customer` | slobodan termin 09:00Z na "A" | 201; `status` = 0; `emailSent` = true; u bazi: `Status` Pending, `CreatedBy` Customer, `StartsAt` 09:00Z, `EndsAt` 09:30Z |
| C2 | `Same_slot_returns_409` | postojeća + isti termin 09:00Z na "A" | 409 |
| C3 | `Partial_overlap_returns_409` | postojeća + 09:15Z na "A" | 409 |
| C4 | `Adjacent_slot_without_buffer_is_allowed` | postojeća + 09:30Z na "A" | **201** — kreiranje namerno nema buffer (Locked Decision u `CLAUDE.md`) |
| C5 | `Same_time_other_bay_is_allowed` | postojeća + 09:00Z na "B" | 201 |
| C6 | `Cancelled_reservation_does_not_conflict` | postojeća sa statusom Cancelled + 09:00Z na "A" | 201 |
| C7 | `Unknown_service_returns_404` | `serviceId` = `Guid.NewGuid()` | 404 |
| C8 | `Inactive_service_returns_404` | usluga sa `isActive: false` | 404 |
| C9 | `Unknown_bay_returns_404` | `bayId` = `Guid.NewGuid()` | 404 |
| C10 | `Inactive_bay_returns_404` | boks sa `isActive: false` | 404 |
| C11 | `Unknown_tenant_returns_404` | `tenantSlug` = `"does-not-exist"` | 404 |
| C12 | `Service_from_other_tenant_returns_404` | `serviceId` usluge drugog tenanta | 404 |
| C13 | `StartsAt_without_zone_returns_400` | `"startsAt": "2030-01-15T09:00:00"` | 400 |
| C14 | `StartsAt_with_offset_is_stored_as_utc` | `"startsAt": "2030-01-15T10:00:00+01:00"` | 201; u bazi `StartsAt` = 09:00Z |
| C15 | `Email_rejected_returns_201_with_emailSent_false` | `Email.NextResult = false` pa slobodan termin | 201; `emailSent` = false |
| C16 | `Email_exception_returns_201_with_emailSent_false` | `Email.ThrowNext = true` pa slobodan termin | 201; `emailSent` = false; rezervacija postoji u bazi |
| C17 | `Missing_customer_name_returns_400` | bez `customerName` | 400 |

Walk-in (`POST /reservations/walk-in`, telo bez `tenantSlug` i bez
`plateNumber`):

| # | Test | Zahtev | Očekivano |
|---|---|---|---|
| W1 | `Walk_in_without_token_returns_401` | bez `Authorization` header-a | 401 |
| W2 | `Walk_in_as_worker_returns_201_confirmed` | token Worker-a tog tenanta (`CreateUserAsync(tenantId, "Worker")` + `LoginAsync`), slobodan termin | 201; `status` = 1; u bazi `CreatedBy` Worker, `TenantId` = tenant workera |
| W3 | `Walk_in_conflict_returns_409` | token Worker-a + postojeća + 09:00Z na "A" | 409 |
| W4 | `Walk_in_with_other_tenants_bay_returns_404` | token Worker-a tenanta X, `bayId` boksa tenanta Y | 404 |

Za W2–W4 koristi poseban `HttpClient` za svaki test i postavi
`client.DefaultRequestHeaders.Authorization = new("Bearer", token)`.

### Izveštaj za Gate 3

- pun sadržaj `CreateReservationTests.cs` i svakog izmenjenog fajla iz `Infrastructure/`
- doslovan izlaz `dotnet test`
- za svaki pali test: očekivano, dobijeno, bez izmene testa

**Commit posle odobrenja:** `test: cover reservation creation outcomes and slot conflicts`

---

## Gate 4 — CI provera, ADR i zatvaranje T1

1. **CI:** `.github/workflows/ci.yml` već radi `dotnet test` u `backend/`
   na `ubuntu-latest` (Docker je dostupan). **Ne menjaj workflow.**
   Lokalno pokreni tačno iste komande kao CI, iz `backend/`:
   ```
   dotnet restore
   dotnet build --no-restore -c Release
   dotnet test --no-build -c Release
   ```
   i nalepi izlaz. CI se stvarno proverava tek posle push-a — push radi
   samo Petar ili uz njegovo eksplicitno odobrenje.

2. **ADR-027** — `docs/decisions/ADR-027-test-strategija.md`, na srpskom
   (latinica), format kao ADR-025/ADR-026 (Status: Predloženo, Datum,
   Autor: Petar Bogdanović; Kontekst, Odluka, Razlozi i razmotrene
   alternative, Posledice, Otvorena pitanja, Reference). Sadržaj:
   - **Odluka:** integracioni testovi kroz `WebApplicationFactory` nad pravim
     Postgres-om (Testcontainers, `postgres:16-alpine`); jedan kontejner po
     test run-u; izolacija podataka kroz novi tenant po testu; okruženje
     `Testing`; lažni `IEmailService`; bez lažiranja sata (cutoff test sa
     pravim vremenom).
   - **Alternative:** EF Core InMemory / SQLite (odbačeno: ne proverava
     Postgres ponašanje — `timestamptz`, `DateTimeKind`, upite sa
     `IgnoreQueryFilters`; P0 bagovi su bili baš takvi); unit testovi
     privatnih metoda availability algoritma (odbačeno za sada: metode su
     `private static` u kontroleru, izdvajanje je promena produkcionog koda
     van T1); `TimeProvider` za cutoff (odloženo: menja produkcioni kod).
   - **Posledice:** testovi traže Docker lokalno i u CI-ju; testovi su
     sporiji od unit testova; novi entiteti po tenantu moraju biti dodati u
     `TestData`.
   - **Otvorena pitanja:** frontend testovi (nema ih); da li izdvojiti
     availability algoritam u zaseban servis kad dođe radno vreme po danima
     (M2).
   - **Reference:** commit-i Gate 1–3, `docs/PROJECT_STATE.md`.
   Status ostaje **Predloženo**; Petar ga menja u Prihvaćeno.

3. **`docs/PROJECT_STATE.md`** — izmene, ne prepisivanje:
   - zaglavlje "Trenutna faza": T1 završen; sledeći korak je minimalan
     produkcioni deploy (M1, tačka 4), čeka Petrov nalog
   - M1 tačka 3: `**T1 — test projekat (ZAVRŠEN).**` + kratak opis i broj testova
   - nova sekcija `### T1 — test projekat (ZAVRŠEN <datum>)` posle P2 sekcije,
     u istom stilu: cilj, commit-i po gate-ovima, broj testova, nalazi
     (svaki pali test koji je Petar odlučio da ostavi ili prijavi kao bag)
   - "ADR dug": `ADR-001 do ADR-027`; ukloni "test strategija (T1)" iz liste
     "Uz feature"
   - "Ključni fajlovi za novu sesiju": dodaj `backend/tests/WashBookPro.Api.Tests/`
   - "Česti razvojni zadaci": red `Backend testovi | dotnet test iz backend/ (traži Docker)`

4. **Obriši `docs/T1-PLAN.md`** u istom commitu.

**Commit posle odobrenja:** `docs: close T1, add ADR-027 test strategy`

---

## Van plana (ne radi, samo prijavi ako primetiš)

- Testovi za `GET /reservations`, `PATCH .../status`, `DELETE`, `GET /reservations/stats`,
  auth, customer auth, usluge, boksove.
- Race condition (dva istovremena POST-a na isti termin).
- Izdvajanje availability algoritma iz kontrolera.
- Frontend testovi.
- Bilo kakva izmena CI workflow-a, `infra/`, `Program.cs` (osim Gate 1, korak 4).

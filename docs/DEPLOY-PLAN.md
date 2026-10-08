# DEPLOY-PLAN.md — plan za minimalan produkcioni deploy (M1, tačka 4)

**Napravljeno:** 2026-10-07 (HEAD `9d2ca04`). **Status:** čeka Petrovo odobrenje, nije započet.
Privremeni fajl: kad se deploy završi, obriši ga u istom commitu kao ažuriranje
`docs/PROJECT_STATE.md` (isto kao `T1-PLAN.md`).

Plan je pisan za agenta koji ga izvršava korak po korak. Sve što ovde nije
navedeno — **ne radiš**. Kad nešto ne ide po planu, **staneš i prijaviš**,
ne improvizuješ.

---

## Cilj

Javni URL rano, da se problemi sa deploy-om otkriju pre M3 (ADR-026):

- `https://<WEB_DOMAIN>` → Next.js web
- `https://<API_DOMAIN>` → ASP.NET Core backend
- Hetzner VPS + Docker Compose, Caddy kao reverse proxy sa automatskim HTTPS-om
- Prva perionica (tenant), vlasnik i radnik postoje u produkcionoj bazi

Domen još nije kupljen. `washbook.rs` ili `washbook.app` — Petar bira u Gate 0.
Do tada svuda koristi promenljive `WEB_DOMAIN` i `API_DOMAIN`; u lokalnoj
proveri (Gate 4) to su `localhost` i `api.localhost`.

**Van plana (M3):** automatski backup, Resend verifikovan domen, monitoring,
NU1903, PWA. Ne radi ništa od toga.

## Odluke koje je Petar već doneo (ne menjati)

- **Migracije u produkciji:** EF Core migration bundle (`efbundle`), pravi se u
  Dockerfile-u, pokreće se ručno kao poseban compose servis `migrate` **pre**
  `up`. Backend **ne** migrira na startu u produkciji (ADR-025 ostaje).
- **Prvi tenant:** jednokratna komanda `bootstrap-tenant` u backend image-u,
  vrednosti iz konfiguracije (env varijable), odbija da radi ako tenant ili
  email već postoje. Pravi tenant + vlasnika + radnika. Usluge i boksove
  vlasnik dodaje sam u dashboardu.
- **Domen i proxy:** poddomeni (`WEB_DOMAIN` za web, `API_DOMAIN` za API),
  Caddy.
- **CORS:** dozvoljeni origin-i iz konfiguracije (`Cors:AllowedOrigins`), ne
  iz koda. Lokalno ostaje `http://localhost:3000`.
- **pnpm:** zaključava se na **10.33.2** preko `packageManager` u
  `web/package.json`; CI i `web/Dockerfile` prate tu vrednost.
- Image-i se build-uju **na VPS-u** (`docker compose build`), bez registry-ja.

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`.

- **Gate po gate.** Posle svakog gate-a STANI. U odgovoru pokaži, kao tekst:
  pun sadržaj svakog novog ili izmenjenog fajla (za `Program.cs` ceo fajl),
  i doslovan izlaz svake provere iz gate-a. Čekaj Petrovo odobrenje.
- **Commit** tek posle odobrenja, jedan po gate-u, tačno poruka iz gate-a.
  Jednolinijski `git commit -m "..."`, **bez AI atribucije**. **Nema push-a.**
- **Ne menjaj ništa van fajlova navedenih u gate-u.** Ako misliš da još nešto
  mora da se promeni, stani i pitaj.
- **Kad test ili provera padne:** ne menjaj očekivanje da bi prošlo. Stani i
  prijavi: šta, očekivano, dobijeno, zašto misliš da je tako.
- **Tajne:** nikad ne upisuj pravu lozinku, ključ ili secret u fajl koji ide u
  git. Nikad ih ne ispisuj u izveštaju (zameni sa `<redacted>`).
- **Booking integritet:** ne diraj `ReservationsController.cs`, availability,
  konflikt-upit ni "Locked Decisions" iz `CLAUDE.md`.
- **Server:** agent ne pristupa VPS-u. Gate 5 izvršava Petar po runbook-u.
- Razgovor sa Petrom na srpskom (latinica). Kod, identifikatori i komentari na
  engleskom; `infra/README.md` i ADR na srpskom.

---

## Okruženje i zamke (pročitaj pre koda)

- Dev okruženje je Docker iz `infra/` (`docker compose up --build -d`), backend
  `:8080`, web `:3000`. **Nikad** `dotnet run` na 5033.
- Backend testovi: `dotnet test` iz `backend/`, traži Docker (ADR-027,
  `backend/global.json`). Svi postojeći testovi (35) moraju ostati zeleni.
- `Program.cs` već baca izuzetak ako `Jwt:Secret` nije podešen; isti obrazac
  ("fail fast") važi za `Cors:AllowedOrigins`.
- `backend/src/WashBookPro.Api/Common/Persistence/AppDbContextFactory.cs` je
  design-time factory sa zakucanim localhost connection string-om. EF alati
  (`dotnet ef ...`) koriste nju, ne `Program.cs`. Zato bundle mora da dobije
  `--connection` pri pokretanju.
- Migracije su u `backend/src/WashBookPro.Api/Common/Persistence/Migrations`
  (8 migracija).
- `Tenant` nema `TenantId` i nije `ITenantScoped`; `User` jeste. Login
  (`AuthService.LoginAsync`) traži korisnika po emailu **preko svih tenanta**,
  pa email korisnika mora biti globalno jedinstven.
- U produkciji `ASPNETCORE_ENVIRONMENT=Production`: ne učitava se
  `appsettings.Development.json`, ne pokreću se migracije ni dev seed, ne
  mapira se Scalar/OpenAPI endpoint.
- `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` (env varijabla) uključuje
  ugrađeni forwarded-headers middleware: backend iza Caddy-ja vidi `https`
  šemu. Ne dodaji `UseForwardedHeaders` u kod.
- `.gitignore` danas **ne** ignoriše `infra/.env.prod` ni `infra/bootstrap.env`.
  Gate 4 to ispravlja; do tada ne pravi te fajlove. Za lokalnu proveru koristi
  `infra/.env.prod.local` (već ignorisan pravilom `.env.*.local`).

---

## Gate 1 — CORS iz konfiguracije

Fajlovi: `backend/src/WashBookPro.Api/Program.cs`,
`backend/src/WashBookPro.Api/appsettings.Development.json`,
`backend/tests/WashBookPro.Api.Tests/Infrastructure/PostgresFixture.cs`,
nov `backend/tests/WashBookPro.Api.Tests/CorsTests.cs`.

### Koraci

1. U `Program.cs` zameni postojeći `AddCors` blok (`DevPolicy` sa zakucanim
   `http://localhost:3000`) ovim:

   ```csharp
   // Allowed browser origins come from configuration (Cors:AllowedOrigins), never
   // from code: localhost:3000 in appsettings.Development.json, the real web
   // domain via Cors__AllowedOrigins__0 in production (ADR-009).
   var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
   if (corsOrigins.Length == 0)
       throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");

   builder.Services.AddCors(options =>
   {
       options.AddPolicy("Default", policy =>
       {
           policy.WithOrigins(corsOrigins)
                 .AllowAnyHeader()
                 .AllowAnyMethod();
       });
   });
   ```

   i `app.UseCors("DevPolicy");` zameni sa `app.UseCors("Default");`.
   Redosled middleware-a se ne menja (`UseCors` ostaje pre `UseAuthentication`).
   Ništa drugo u `Program.cs` ne menjaj.

2. U `appsettings.Development.json` dodaj sekciju (ostale vrednosti ne diraj):

   ```json
   "Cors": {
     "AllowedOrigins": [ "http://localhost:3000" ]
   }
   ```

3. U `PostgresFixture.cs`, pored ostalih `UseSetting` poziva:

   ```csharp
   builder.UseSetting("Cors:AllowedOrigins:0", CorsTests.AllowedOrigin);
   ```

4. `CorsTests.cs` (`[Collection(ApiCollection.Name)]`), sa
   `public const string AllowedOrigin = "https://washbook.test";` — namerno
   **ne** localhost, da test dokaže da vrednost dolazi iz konfiguracije.
   Preflight zahtev: `OPTIONS /reservations` sa header-ima
   `Origin` i `Access-Control-Request-Method: POST`
   (koristi `HttpRequestMessage`, prosledi `TestContext.Current.CancellationToken`).

   | # | Test | Origin | Očekivano |
   |---|---|---|---|
   | K1 | `Preflight_from_configured_origin_is_allowed` | `https://washbook.test` | 2xx; header `Access-Control-Allow-Origin` = `https://washbook.test` |
   | K2 | `Preflight_from_other_origin_is_not_allowed` | `https://evil.example` | nema header-a `Access-Control-Allow-Origin` |
   | K3 | `Localhost_is_not_allowed_unless_configured` | `http://localhost:3000` | nema header-a `Access-Control-Allow-Origin` |

### Provera

1. Iz `backend/`: `dotnet build` (0 grešaka) i `dotnet test` (38/38).
2. Dev stack (iz `infra/`): `docker compose up --build -d backend`, sačekaj
   `curl --retry 10 --retry-connrefused -s -o /dev/null -w "%{http_code}" http://localhost:8080/health`
   = 200, pa:

   ```
   curl -s -i -X OPTIONS http://localhost:8080/reservations -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST"
   ```

   Očekivano: `Access-Control-Allow-Origin: http://localhost:3000`. Isto sa
   `-H "Origin: https://evil.example"` → bez tog header-a. Nalepi oba izlaza
   (samo status liniju i `Access-Control-*` header-e).
3. U browseru (`http://localhost:3000/book/dev-wash`) prođi prvi korak
   booking-a do liste termina. Prijavi da li se termini učitavaju.

**Commit posle odobrenja:** `feat(backend): read allowed CORS origins from configuration`

---

## Gate 2 — pnpm 10.33.2 svuda

Fajlovi: `web/package.json`, `.github/workflows/ci.yml`, `web/Dockerfile`.

### Koraci

1. `web/package.json`: dodaj polje na najvišem nivou
   `"packageManager": "pnpm@10.33.2"`. Ništa drugo ne menjaj.
2. `.github/workflows/ci.yml`, korak "Setup pnpm": **ukloni** `with:` blok sa
   `version: latest` (akcija `pnpm/action-setup@v4` tada čita verziju iz
   `packageManager`; ako su obe navedene i razlikuju se, akcija pada).
   Pošto `package.json` nije u korenu repoa, dodaj
   `with:` → `package_json_file: web/package.json`. Ništa drugo u workflow-u.
3. `web/Dockerfile`:
   - build stage: zameni `RUN corepack enable && corepack prepare pnpm@latest --activate`
     sa `RUN corepack enable` (corepack čita `packageManager` iz
     `package.json`, koji se kopira pre `pnpm install`)
   - runtime stage: **ukloni** red `RUN corepack enable && corepack prepare pnpm@latest --activate`
     (runtime pokreće `node server.js`, pnpm mu ne treba)

### Provera

1. Iz `web/`: `pnpm --version` (očekivano `10.33.2`),
   `pnpm install --frozen-lockfile` (bez izmene `pnpm-lock.yaml`:
   `git status --short web/pnpm-lock.yaml` prazan),
   `pnpm exec tsc --noEmit`, `pnpm build`.
2. Iz `infra/`: `docker compose build web`. U izlazu nađi liniju koja pokazuje
   verziju pnpm-a i nalepi je. Poznata prepreka: greška corepack-a
   `Cannot find matching keyid` → stani i prijavi (ne menjaj Node sliku).
3. CI se stvarno proverava tek posle Petrovog push-a.

**Commit posle odobrenja:** `build(web): pin pnpm 10.33.2 for local, CI and Docker`

---

## Gate 3 — migration bundle i `bootstrap-tenant`

Fajlovi: `backend/Dockerfile`, `backend/src/WashBookPro.Api/Program.cs`,
nov `backend/src/WashBookPro.Api/Modules/Tenants/TenantBootstrap.cs`,
nov `backend/tests/WashBookPro.Api.Tests/TenantBootstrapTests.cs`.

### Koraci — migration bundle

1. Utvrdi tačnu verziju `Microsoft.EntityFrameworkCore` koju backend koristi
   (`backend/src/WashBookPro.Api/obj/project.assets.json`, ključ
   `Microsoft.EntityFrameworkCore/<verzija>`). `dotnet-ef` mora biti ista
   verzija. U izveštaju navedi verziju.
2. U `backend/Dockerfile`, **između** build i runtime stage-a (runtime mora
   ostati **poslednji** stage, jer se on build-uje kad nema `target`), dodaj:

   ```dockerfile
   # Stage: EF Core migration bundle (run once per deploy, before `up`; ADR-025)
   FROM build AS migrations
   RUN dotnet tool install --global dotnet-ef --version <EF_VERZIJA>
   ENV PATH="${PATH}:/root/.dotnet/tools"
   RUN dotnet ef migrations bundle \
       --project src/WashBookPro.Api/WashBookPro.Api.csproj \
       --configuration Release \
       --runtime linux-x64 \
       --output /app/efbundle \
       --force

   FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS migrate
   WORKDIR /app
   COPY --from=migrations /app/efbundle .
   ENTRYPOINT ["sh", "-c", "./efbundle --connection \"$ConnectionStrings__Default\""]
   ```

   Ako `dotnet ef migrations bundle` pukne zato što pokušava da pokrene
   `Program.cs` (npr. `Jwt:Secret is not configured`), stani i prijavi.

### Koraci — `bootstrap-tenant`

3. `Modules/Tenants/TenantBootstrap.cs`, namespace
   `WashBookPro.Api.Modules.Tenants`:

   ```csharp
   public sealed record TenantBootstrapOptions(
       string TenantName, string TenantSlug,
       string? Address, string? Phone,
       TimeOnly OpeningTime, TimeOnly ClosingTime,
       string OwnerEmail, string OwnerPassword,
       string WorkerEmail, string WorkerPassword);

   public enum TenantBootstrapResult
   {
       Created = 0,
       InvalidConfiguration = 1,
       TenantAlreadyExists = 2,
       EmailAlreadyExists = 3,
   }

   public static class TenantBootstrap
   {
       // Reads the "Bootstrap" section (env: Bootstrap__TenantName, ...). Returns
       // null and logs which keys are missing or invalid — never their values.
       public static TenantBootstrapOptions? ReadOptions(IConfiguration config, ILogger logger);

       public static Task<TenantBootstrapResult> RunAsync(
           AppDbContext db, TenantBootstrapOptions options, ILogger logger,
           CancellationToken cancellationToken = default);
   }
   ```

   Konfiguracioni ključevi (sekcija `Bootstrap`): `TenantName`, `TenantSlug`,
   `Address` (opciono), `Phone` (opciono), `OpeningTime` i `ClosingTime`
   (format `HH:mm`), `OwnerEmail`, `OwnerPassword`, `WorkerEmail`,
   `WorkerPassword`.

   `ReadOptions` vraća `null` (i loguje razlog **bez vrednosti**) ako:
   - nedostaje bilo koji obavezan ključ ili je prazan
   - `TenantSlug` ne odgovara `^[a-z0-9-]{3,100}$`
   - `OpeningTime`/`ClosingTime` nisu `HH:mm`, ili `OpeningTime >= ClosingTime`
   - email nema `@`, ili su `OwnerEmail` i `WorkerEmail` isti (bez obzira na velika/mala slova)
   - lozinka je kraća od 10 znakova

   `RunAsync`:
   - ponovi iste provere nad `options` (testovi zovu `RunAsync` direktno);
     neispravno → `InvalidConfiguration`, ništa se ne upisuje
   - tenant sa istim `Slug` postoji → `TenantAlreadyExists`, ništa se ne upisuje
     (`IgnoreQueryFilters`, `FirstOrDefaultAsync`/`AnyAsync`, nikad `FindAsync`)
   - bilo koji `User` sa `OwnerEmail` ili `WorkerEmail` postoji (preko svih
     tenanta, `IgnoreQueryFilters`) → `EmailAlreadyExists`, ništa se ne upisuje
   - inače: jedan `SaveChangesAsync` koji upisuje `Tenant` (`Id = Guid.NewGuid()`,
     `IsActive = true`, `CreatedAt = DateTimeOffset.UtcNow`, ostala polja iz
     options), `User` sa `Role = "Owner"` i `User` sa `Role = "Worker"`
     (`PasswordHash = BCrypt.Net.BCrypt.HashPassword(...)`, isto kao
     `DevDataSeed.cs`; `CreatedAt = DateTimeOffset.UtcNow`)
   - loguje ID tenanta i oba korisnika i email-ove, **nikad lozinke**
   - vraća `Created`

4. `Program.cs`: odmah posle `var app = builder.Build();` dodaj:

   ```csharp
   // One-off production setup: `docker compose run --rm backend bootstrap-tenant`.
   // Creates the first tenant + owner + worker from the Bootstrap config section,
   // then exits without starting the web server.
   if (args.Length > 0 && args[0] == "bootstrap-tenant")
   {
       using var bootstrapScope = app.Services.CreateScope();
       var bootstrapLogger = bootstrapScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
       var options = TenantBootstrap.ReadOptions(app.Configuration, bootstrapLogger);
       var result = options is null
           ? TenantBootstrapResult.InvalidConfiguration
           : await TenantBootstrap.RunAsync(
               bootstrapScope.ServiceProvider.GetRequiredService<AppDbContext>(), options, bootstrapLogger);
       Environment.ExitCode = (int)result;
       return;
   }
   ```

   (dodaj potreban `using WashBookPro.Api.Modules.Tenants;`). Ništa drugo u
   `Program.cs` ne menjaj.

5. `TenantBootstrapTests.cs` (`[Collection(ApiCollection.Name)]`). Svaki test
   pravi jedinstven slug i email-ove (`Guid`), dobija `AppDbContext` iz
   `fixture.Factory.Services.CreateScope()`, logger `NullLogger.Instance`.

   | # | Test | Postavka | Očekivano |
   |---|---|---|---|
   | B1 | `Creates_tenant_owner_and_worker` | ispravne opcije, 07:00–20:00 | `Created`; tenant u bazi sa tim slug-om, `OpeningTime` 07:00, `ClosingTime` 20:00, `IsActive` true; `POST /auth/login` za vlasnika i za radnika → 200 |
   | B2 | `Existing_slug_is_rejected` | B1 dva puta sa istim slug-om, različitim email-ovima | drugi poziv `TenantAlreadyExists`; korisnici iz drugog poziva ne postoje |
   | B3 | `Existing_email_is_rejected` | korisnik sa `OwnerEmail` već postoji (`TestData.CreateUserAsync` vraća email — iskoristi ga) | `EmailAlreadyExists`; tenant sa novim slug-om ne postoji |
   | B4 | `Short_password_is_rejected` | `WorkerPassword` = 9 znakova | `InvalidConfiguration`; ništa nije upisano |
   | B5 | `Opening_after_closing_is_rejected` | 20:00–07:00 | `InvalidConfiguration`; ništa nije upisano |
   | B6 | `ReadOptions_returns_null_when_key_missing` | `ConfigurationBuilder().AddInMemoryCollection(...)` bez `OwnerPassword` | `ReadOptions` vraća `null` |

### Provera

1. Iz `backend/`: `dotnet build`, `dotnet test` (44/44).
2. Iz `backend/`: `docker build --target migrate -t washbook-migrate-check .`
   uspeva. Nalepi poslednjih 10 linija.
3. Dev stack (iz `infra/`) i dalje radi: `docker compose up --build -d backend`,
   `/health` = 200.

**Commit posle odobrenja:** `feat(backend): add production migration bundle and tenant bootstrap command`

---

## Gate 4 — produkcioni compose, Caddy, runbook i lokalna proba

Fajlovi: nov `infra/docker-compose.prod.yml`, nov `infra/Caddyfile`,
nov `infra/.env.prod.example`, `infra/README.md` (prepisuje se — danas je
prazan stub), `.gitignore`.

### Koraci

1. `.gitignore`, ispod postojećeg `infra/.env`, dodaj:

   ```
   infra/.env.prod
   infra/bootstrap.env
   ```

   Proveri: `git check-ignore -v infra/.env.prod infra/bootstrap.env infra/.env.prod.local`
   pogađa sva tri, a `git check-ignore infra/.env.prod.example` ne pogađa ništa.

2. `infra/docker-compose.prod.yml` — samostalan fajl (ne override dev fajla):

   ```yaml
   # Production stack: Caddy (HTTPS) -> web / backend. Postgres and the backend
   # are reachable only on the internal network; no pgAdmin in production.
   # Usage (from infra/): docker compose -f docker-compose.prod.yml --env-file .env.prod <command>
   name: washbook-prod

   services:
     postgres:
       image: postgres:16-alpine
       restart: unless-stopped
       environment:
         POSTGRES_DB: ${POSTGRES_DB}
         POSTGRES_USER: ${POSTGRES_USER}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       networks:
         - internal
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
         interval: 10s
         timeout: 5s
         retries: 5

     # One-off: docker compose ... run --rm migrate
     migrate:
       build:
         context: ../backend
         dockerfile: Dockerfile
         target: migrate
       profiles: ["tools"]
       environment:
         ConnectionStrings__Default: ${CONNECTION_STRING}
       networks:
         - internal
       depends_on:
         postgres:
           condition: service_healthy

     backend:
       build:
         context: ../backend
         dockerfile: Dockerfile
       restart: unless-stopped
       environment:
         ASPNETCORE_ENVIRONMENT: Production
         ASPNETCORE_FORWARDEDHEADERS_ENABLED: "true"
         ConnectionStrings__Default: ${CONNECTION_STRING}
         Jwt__Secret: ${JWT_SECRET}
         Jwt__Issuer: ${JWT_ISSUER}
         Jwt__Audience: ${JWT_AUDIENCE}
         Resend__ApiKey: ${RESEND_API_KEY}
         Resend__FromEmail: ${RESEND_FROM_EMAIL}
         Google__ClientId: ${GOOGLE_CLIENT_ID}
         Google__ClientSecret: ${GOOGLE_CLIENT_SECRET}
         Frontend__BaseUrl: https://${WEB_DOMAIN}
         Cors__AllowedOrigins__0: https://${WEB_DOMAIN}
       networks:
         - internal
       depends_on:
         postgres:
           condition: service_healthy

     web:
       build:
         context: ../web
         dockerfile: Dockerfile
         args:
           NEXT_PUBLIC_API_URL: https://${API_DOMAIN}
       restart: unless-stopped
       environment:
         INTERNAL_API_URL: http://backend:8080
       networks:
         - internal
       depends_on:
         - backend

     caddy:
       image: caddy:2-alpine
       restart: unless-stopped
       ports:
         - "80:80"
         - "443:443"
         - "443:443/udp"
       environment:
         WEB_DOMAIN: ${WEB_DOMAIN}
         API_DOMAIN: ${API_DOMAIN}
         ACME_EMAIL: ${ACME_EMAIL}
       volumes:
         - ./Caddyfile:/etc/caddy/Caddyfile:ro
         - caddy_data:/data
         - caddy_config:/config
       networks:
         - internal
       depends_on:
         - web
         - backend

   volumes:
     postgres_data:
     caddy_data:
     caddy_config:

   networks:
     internal:
       driver: bridge
   ```

   Nijedan servis osim `caddy` nema `ports:`. Nema `container_name:` (da se
   ne sudara sa dev kontejnerima pri lokalnoj probi).

3. `infra/Caddyfile`:

   ```
   {
   	email {$ACME_EMAIL}
   }

   {$WEB_DOMAIN} {
   	encode zstd gzip
   	reverse_proxy web:3000
   }

   {$API_DOMAIN} {
   	encode zstd gzip
   	reverse_proxy backend:8080
   }
   ```

4. `infra/.env.prod.example` — svi ključi koje koristi
   `docker-compose.prod.yml`, sa praznim vrednostima ili bezopasnim primerom,
   i komentarom na srpskom iznad svake grupe. Obavezno:
   `WEB_DOMAIN`, `API_DOMAIN`, `ACME_EMAIL`, `POSTGRES_DB`, `POSTGRES_USER`,
   `POSTGRES_PASSWORD`, `CONNECTION_STRING`
   (primer: `Host=postgres;Port=5432;Database=<POSTGRES_DB>;Username=<POSTGRES_USER>;Password=<POSTGRES_PASSWORD>`),
   `JWT_SECRET` (komentar: `openssl rand -base64 48`), `JWT_ISSUER=WashBookPro`,
   `JWT_AUDIENCE=WashBookPro`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Nijedna prava tajna.

5. `infra/README.md` — runbook na srpskom (zamenjuje stub). Sekcije:
   1. **Lokalni razvoj** — postojeći `docker compose up --build -d` (kratko).
   2. **Produkcija — prvi put na novom serveru** (komande za Ubuntu 24.04):
      instalacija Docker Engine + compose plugin po zvaničnom uputstvu
      (link na docs.docker.com, bez kopiranja skripte), `ufw` (dozvoli
      OpenSSH, 80/tcp, 443/tcp, 443/udp), `git clone`, `cp .env.prod.example .env.prod`
      i popunjavanje, provera DNS-a (`dig +short <WEB_DOMAIN>` i
      `dig +short <API_DOMAIN>` = IP servera), zatim redom:
      ```
      docker compose -f docker-compose.prod.yml --env-file .env.prod build
      docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres
      docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate
      docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
      ```
   3. **Prvi tenant** — `infra/bootstrap.env` sa `Bootstrap__*` ključevima
      (prazan šablon u README-u, bez pravih vrednosti), pokretanje
      `bootstrap-tenant` (tačnu komandu utvrdi u koraku 6 i upiši je),
      značenje izlaznih kodova 0–3, i **brisanje `bootstrap.env` posle uspeha**.
   4. **Ažuriranje** — `git pull`, `build`, `run --rm migrate`, `up -d`.
   5. **Provera posle deploy-a** — lista iz Gate 5, tačka 4.
   6. **Ručni koraci van servera** — Google Cloud Console: authorized
      redirect URI `https://<API_DOMAIN>/auth/google/callback` i JavaScript
      origin `https://<WEB_DOMAIN>`; bez toga Google login ne radi, a
      email/lozinka radi. Resend: do M3 email stiže samo na adresu vlasnika
      Resend naloga (`emailSent: false` za ostale je očekivano).
   7. **Šta nije pokriveno do M3** — backup, monitoring, Resend domen.

6. **Lokalna proba celog prod stack-a** (Docker Desktop, dev stack može da
   radi paralelno — prod ne koristi portove 5432/8080/3000/5050):
   - napravi `infra/.env.prod.local` (ignorisan) sa `WEB_DOMAIN=localhost`,
     `API_DOMAIN=api.localhost`, `ACME_EMAIL=test@example.com`, test
     lozinkama, `GOOGLE_CLIENT_ID=local-test`, `GOOGLE_CLIENT_SECRET=local-test`,
     `RESEND_API_KEY=local-test`, `RESEND_FROM_EMAIL=test@example.com`
   - iz `infra/`, redom (sa `--env-file .env.prod.local`): `build`,
     `up -d postgres`, `run --rm migrate`, `up -d`
   - utvrdi kako `docker compose run` prima env fajl
     (`docker compose run --help`; traži `--env-from-file`). Ako postoji,
     pokreni bootstrap sa privremenim `infra/bootstrap.env`; ako ne postoji,
     sa `-e Bootstrap__...` opcijama. Upiši tačnu komandu u README.
     Pa ponovi isti bootstrap → izlazni kod 2.
   - provere (Caddy na `localhost` izdaje lokalni sertifikat, zato `-k`):
     ```
     curl -k -s -o /dev/null -w "%{http_code}\n" https://api.localhost/health          # 200
     curl -k -s -o /dev/null -w "%{http_code}\n" https://localhost/                    # 200
     curl -k -s -i -X OPTIONS https://api.localhost/reservations -H "Origin: https://localhost" -H "Access-Control-Request-Method: POST"   # Access-Control-Allow-Origin: https://localhost
     curl -k -s -i https://api.localhost/auth/google                                   # 302, Location sadrži redirect_uri=https%3A%2F%2Fapi.localhost%2Fauth%2Fgoogle%2Fcallback
     curl -k -s -X POST https://api.localhost/auth/login -H "Content-Type: application/json" -d "{\"email\":\"<owner>\",\"password\":\"<lozinka>\"}"   # 200 sa accessToken (token u izveštaju skrati)
     ```
     Četvrta provera dokazuje da forwarded headers rade (`https`, ne `http`).
   - provera da baza nije spolja dostupna:
     `docker compose -f docker-compose.prod.yml --env-file .env.prod.local ps`
     — samo `caddy` ima mapirane portove.
   - na kraju: `docker compose -f docker-compose.prod.yml --env-file .env.prod.local down -v`
     i obriši `infra/bootstrap.env` ako je napravljen. `infra/.env.prod.local`
     može da ostane (ignorisan je).
   - Poznate prepreke: port 80 ili 443 zauzet na Windows-u → stani i prijavi;
     `api.localhost` se ne razrešava → prijavi verziju `curl --version`.

**Commit posle odobrenja:** `build(infra): add production compose with Caddy and deploy runbook`

---

## Gate 5 — prvi deploy na VPS (izvršava Petar)

Agent u ovom gate-u ne menja fajlove i ne pristupa serveru. Petar izvršava
runbook iz `infra/README.md` i lepi izlaze; agent ih tumači i poredi sa
očekivanim. Ako runbook ima grešku, agent predlaže izmenu README-a kao
poseban mini-commit (`docs(infra): fix deploy runbook`) — tek uz odobrenje.

1. **Preduslovi (Gate 0, Petar):** kupljen domen; Hetzner VPS (Ubuntu 24.04,
   SSH ključ); DNS A zapisi za `WEB_DOMAIN` i `API_DOMAIN` na IP servera;
   repo dostupan sa servera (javni repo ili deploy ključ).
2. Runbook sekcije 2 i 3.
3. U Google Cloud Console upisati redirect URI i origin (runbook sekcija 6) —
   ili svesno odložiti; tada Google login ne radi.
4. **Provera (sve mora da prođe):**
   - `https://<API_DOMAIN>/health` → 200, validan sertifikat (bez `-k`)
   - `https://<WEB_DOMAIN>/` se otvara u browseru, katanac ispravan
   - login vlasnika na `/login` → dashboard; vlasnik dodaje boks i uslugu
   - `https://<WEB_DOMAIN>/book/<slug>`: termini se prikazuju, rezervacija
     prolazi, success stranica (email: očekivano `emailSent: false` osim za
     adresu vlasnika Resend naloga)
   - login radnika → terminal, rezervacija je vidljiva, walk-in prolazi
   - sa lokalnog računara: `nc -vz <IP> 5432` i `nc -vz <IP> 8080` ne uspevaju

---

## Gate 6 — ADR za hosting, dokumentacija, zatvaranje

Fajlovi: nov `docs/decisions/ADR-NNN-hosting-i-deploy.md` (NNN = sledeći slobodan broj u trenutku pisanja; ADR-028 je strategija platforme),
`docs/PROJECT_STATE.md`, `CLAUDE.md` (samo jedan red, vidi 3), brisanje
`docs/DEPLOY-PLAN.md`.

1. **ADR-NNN** (srpski, format kao ADR-026/027, Status: Predloženo, Autor:
   Petar Bogdanović). Odluka: Hetzner VPS + Docker Compose; Caddy sa
   poddomenima i automatskim HTTPS-om; image-i se build-uju na serveru;
   migracije kao `efbundle` + `migrate` servis (zatvara otvoreno pitanje iz
   ADR-025); `bootstrap-tenant` umesto onboardinga; CORS iz konfiguracije
   (ispunjava ADR-009); forwarded headers preko env varijable; pnpm 10.33.2
   zaključan preko `packageManager`. Alternative: nginx + certbot, migracija na
   startu, SQL skripta za prvi tenant, registry + CI build. Posledice i
   otvorena pitanja: backup, monitoring i Resend su M3; build na serveru troši
   RAM/CPU servera; prelazak na pnpm 12 je poseban korak. Reference: commit-i
   Gate 1–4, ADR-009, ADR-025, ADR-026.
2. **`docs/PROJECT_STATE.md`** — izmene, ne prepisivanje:
   - zaglavlje: deploy završen, javni URL; sledeći korak čeka Petrov nalog
     (M1 je time završen → M2)
   - M1 tačka 4 označena `(ZAVRŠEN)` sa URL-om
   - nova sekcija `### Deploy — minimalna produkcija (ZAVRŠEN <datum>)` posle
     T1 sekcije: cilj, commit-i po gate-ovima, rezultat provere iz Gate 5,
     nalazi, šta ostaje za M3
   - "ADR dug": `ADR-001 do ADR-NNN`; ukloni "hosting i deploy" iz liste
     "Uz feature"
   - "Česti razvojni zadaci": red `Produkcija | vidi infra/README.md`
3. **`CLAUDE.md`**, sekcija "Dev Environment": red
   `- Frontend: port 3000 (CORS is hardcoded to it). Package manager: pnpm`
   postaje
   `- Frontend: port 3000 (allowed via Cors:AllowedOrigins in appsettings.Development.json). Package manager: pnpm 10.33.2 (pinned in web/package.json)`.
   Ovo je izmena `CLAUDE.md` — u izveštaju je posebno istakni; Petar je
   odobrava zasebno.
4. Obriši `docs/DEPLOY-PLAN.md`.

**Commit posle odobrenja:** `docs: close production deploy, add ADR-NNN`

---

## Van plana (ne radi, samo prijavi ako primetiš)

- Backup baze, monitoring, logovi, Resend domen, NU1903, PWA (sve M3).
- Prelazak na pnpm 12, nova Node verzija u Dockerfile-u.
- Image registry, CI deploy, staging okruženje.
- Bilo kakva izmena `ReservationsController.cs`, booking flow-a, terminala ili dashboarda.
- Rate limiting, `Customer` tabela koja neograničeno raste (eskalirani problem).

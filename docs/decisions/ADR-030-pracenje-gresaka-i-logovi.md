# ADR-030 — Praćenje grešaka i logovi

**Status:** Prihvaćeno
**Datum:** 2026-11-09
**Autor:** Petar Bogdanović

## Kontekst

Plan razvoja (Sprint A1) traži praćenje grešaka na backendu i u web-u i
strukturirane logove pre pilota. Do Gate 4 greške su postojale samo u
konzoli kontejnera: niko ne bi saznao za grešku koju vidi radnik na
terminalu ili vozač na javnoj stranici, osim ako je sam prijavi.

Gate 4 (`ad69d6e`) je uveo Serilog sa Seq-om za logove. Ovaj ADR beleži
podelu posla između logova i praćenja grešaka i pravila o ličnim podacima.

## Odluka

### 1. Podela: Seq za logove, Sentry za greške

- **Serilog + Seq**: svi strukturirani logovi backenda (`RequestId`,
  `TenantId`, `UserId`). Seq je za sada samo u dev-u; produkcija se rešava
  u Sprintu A4.
- **Sentry**: samo greške, na backendu (ASP.NET Core) i u web-u (Next.js,
  server, edge i browser). Nalog: org `washbook`, **EU region**, besplatni
  plan, projekti `washbook-backend` i `washbook-web`.

Tracing, Session Replay, logovi i metrike u Sentry-ju su **isključeni**.
Logovi već postoje u Seq-u, a tracing troši kvotu besplatnog plana bez
koristi u ovoj fazi.

### 2. Backend

- Paketi `Sentry.AspNetCore` i `Sentry.Serilog` (6.12.1).
- `UseSentry` inicijalizuje SDK. Serilog sink (`InitializeSdk = false`)
  pretvara svaki log nivoa `Error` i višeg u Sentry događaj, a logove od
  `Information` naviše prilaže kao breadcrumbs.
- Neuhvaćen izuzetak hvataju i Sentry middleware i Serilog request log.
  SDK odbacuje duplikat: provereno uživo, jedan izuzetak = jedan događaj.
- DSN: `Sentry:Dsn` (`Sentry__Dsn` u compose-u, iz `SENTRY_DSN_BACKEND`).
  .NET SDK **baca izuzetak pri startu kad DSN ne postoji**, a isključuje se
  samo praznim stringom, pa kod nepostojeći DSN pretvara u `""`. Testovi i
  dev bez Sentry naloga rade bez ikakvog podešavanja.

### 3. Web

- Paket `@sentry/nextjs` (11.11.0). Fajlovi: `instrumentation.ts`,
  `instrumentation-client.ts`, `sentry.server.config.ts`,
  `sentry.edge.config.ts`, `app/global-error.tsx`. Zajedničke opcije su u
  `lib/sentry-options.ts`.
- DSN i ime okruženja se ugrađuju pri build-u (`NEXT_PUBLIC_SENTRY_DSN` iz
  `SENTRY_DSN_WEB`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`). Promena DSN-a traži
  novi build. DSN za web je po prirodi javan (nalazi se u JS bundle-u), što
  je kod Sentry-ja očekivano: dozvoljava samo slanje događaja.
- Lokalni Docker build je produkcioni build (`NODE_ENV=production`), pa se
  okruženje zadaje eksplicitno: `development` u dev compose-u, `production`
  u prod compose-u.

### 4. Lični podaci

Javna stranica za zakazivanje šalje ime, telefon i email, a terminal i
dashboard rade sa JWT-om. Zato:

- Backend: `SendDefaultPii = false` (bez korisnika iz JWT-a, bez IP adrese
  korisnika), `MaxRequestBodySize = None` (bez tela zahteva).
- Web: `@sentry/nextjs` v11 je zamenio `sendDefaultPii` opcijom
  `dataCollection`, i **kad ona nije podešena, šalje sve** (korisnik,
  kolačići, zaglavlja, tela zahteva). Zato su eksplicitno isključeni
  `userInfo`, `cookies`, `httpHeaders`, `httpBodies`, `urlQueryParams` i
  `stackFrameVariables`.
- `urlQueryParams` je isključen jer query string nosi lične podatke i
  tokene: `/book/[slug]/success` prima ime i tablicu, a `/auth/callback`
  access i refresh token. Provereno uživo: query se ne pojavljuje u događaju.
- Lokacija (`user.geo`) koju Sentry prikazuje izvodi se iz IP adrese
  pošiljaoca na Sentry strani; IP adresa se ne čuva u događaju.

### 5. Source maps

Za sada se ne šalju (`sourcemaps.disable`), jer upload traži tajni token pri
build-u. Stack trace iz browsera je zato minifikovan. Uvodi se kad zatreba,
sa `SENTRY_AUTH_TOKEN` samo u build okruženju.

## Posledice

- Svaka greška na backendu (neuhvaćen izuzetak ili `LogError`) i u web-u
  stiže u Sentry sa okruženjem i putanjom, bez ličnih podataka.
- Upozorenja (`LogWarning`) idu samo kao breadcrumbs uz grešku. Upozorenje
  u `ResendEmailService` loguje telo greške od Resend-a, koje može sadržati
  adresu primaoca; to je već otvoren nalaz za A4.
- Web kontejner pri startu ispisuje `Failed to register diagnostics-channel
  injection hooks`: standalone build ne kopira jedan Sentry fajl. To pogađa
  samo spanove (tracing), koji su isključeni; greške se hvataju. Ako se
  tracing uključi, ovo mora prvo da se reši.
- Produkcija (A4) dobija `SENTRY_DSN_BACKEND` i `SENTRY_DSN_WEB` u
  `.env.prod`; bez njih sve radi, samo bez praćenja grešaka.

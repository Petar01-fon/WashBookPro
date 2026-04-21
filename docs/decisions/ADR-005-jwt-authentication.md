# ADR-005 — JWT autentikacija

- **Datum:** 2026-04-21
- **Status:** Prihvaćeno

---

## Kontekst

WashBookPro je multi-tenant SaaS platforma. Svaki HTTP zahtev mora biti vezan za tačno određenog tenanta, a korisnik mora biti autentifikovan pre pristupa zaštićenim endpointima. JWT token je prirodan izbor jer može da nosi `tenant_id` claim uz ostale korisničke podatke, čime se eliminiše potreba za dodatnim pozivom bazi radi određivanja tenanta po zahtevu.

---

## Odluka

Koristi se JWT Bearer autentikacija sa dva tipa tokena:

- **Access token** — traje 15 minuta, nosi claimove `sub` (user ID), `tenant_id` i `role`
- **Refresh token** — traje 7 dana, čuva se u koloni `RefreshToken` tabele `Users` i rotira se pri svakom pozivu `/auth/refresh`

JWT konfiguracija (Secret, Issuer, Audience) se čita iz `appsettings` / User Secrets, bez ikakvih tajnih vrednosti u kodu ili git istoriji.

---

## Razlozi

**BCrypt za hashing lozinki** — industrijski standard za hashing lozinki sa ugrađenim salt-om; paket `BCrypt.Net-Next`.

**`IgnoreQueryFilters()` na auth upitima** — pri registraciji i loginu korisnik još nema `TenantId` u `HttpContext`-u (middleware nije bio pozvan), pa bi globalni EF Core tenant filter uvek vraćao prazne rezultate. Pozivanjem `IgnoreQueryFilters()` u `AuthService` zaobilazimo filter i ručno filtriramo po `TenantId` parametru iz request body-ja.

**Refresh token rotacija** — pri svakom uspešnom pozivu `/auth/refresh` stari refresh token se odmah zamenjuje novim. Na ovaj način otkrivamo eventualno preuzimanje tokena (token reuse detection) jer stari token postaje nevažeći čim bude iskorišćen.

---

## Posledice

- Svaki zaštićeni endpoint mora imati `[Authorize]` atribut; endpointi bez atributa su javno dostupni.
- Refresh token rotacija znači da klijent mora da zapamti i ažurira refresh token nakon svakog poziva `/auth/refresh` — stari token odmah postaje nevažeći.
- `IDesignTimeDbContextFactory` (korišćen od strane EF Core alata pri kreiranju migracija) mora koristiti `NullTenantContext` jer nema HTTP kontekst tokom dizajn-time operacija.

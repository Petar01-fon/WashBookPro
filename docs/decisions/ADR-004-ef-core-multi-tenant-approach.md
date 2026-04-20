# ADR-004: EF Core i pristup multi-tenant izolaciji podataka

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

Potrebno je odabrati ORM i strategiju izolacije podataka između tenanta pre početka
implementacije domenskih modula. Platforma je multi-tenant SaaS sa tri tipa korisnika
(B2C, B2B, vlasnici autopraonica), gde svaki vlasnik autopraonica predstavlja zasebnog
tenanta čiji podaci ne smeju biti vidljivi drugim tenantima.

## Odluka

Koristimo **EF Core 10 sa Npgsql provajderom** i strategiju
**shared database — shared schema** sa `TenantId` kolonom na svakom tenant-specifičnom
entitetu.

Izolacija se postiže kroz:

- `ITenantScoped` — marker interfejs koji implementiraju svi entiteti koji pripadaju
  tenantu (sadrži `Guid TenantId` property)
- `ITenantContext` — interfejs koji izlaže trenutni `TenantId` iz JWT claima `tenant_id`
- `HttpContextTenantContext` — konkretna implementacija koja čita claim iz HTTP konteksta
- `AppDbContext` — automatski registruje global query filter za sve tipove koji
  implementiraju `ITenantScoped`, koristeći vrednost iz `ITenantContext`

## Razlozi

**Zašto ne database-per-tenant:**
Database-per-tenant pruža najjaču izolaciju, ali donosi operativnu kompleksnost koja
nije opravdana u ranoj fazi: potrebno je upravljati N bazama, N migracionih pipeline-a
i N konekcija. Za platformu koja tek raste i ima jednog developera, trošak je previsok.

**Zašto ne schema-per-tenant:**
Schema-per-tenant je kompromis između prethodnih opcija, ali EF Core nema prvu klasu
podrške za dinamičke sheme — zahteva ručno upravljanje, što povećava složenost bez
značajne koristi u odnosu na shared schema sa RLS ili query filterima.

**Zašto global query filter umesto manuelnog filtriranja:**
Manuelno dodavanje `.Where(e => e.TenantId == currentTenantId)` na svaki upit je
podložno greškama — jedno propušteno mesto znači curenje podataka između tenanta.
EF Core global query filteri se primenjuju automatski na sve upite za dati tip,
što eliminiše ovu klasu grešaka. Filter se može selektivno isključiti sa
`IgnoreQueryFilters()` kada je to svesna odluka (npr. admin kontekst).

## Posledice

- Svaki budući entitet koji pripada tenantu **mora implementirati `ITenantScoped`** —
  u suprotnom neće biti filtriran i podaci će biti vidljivi svim tenantima.
- `TenantId` kolona mora biti indeksirana na svim `ITenantScoped` tabelama radi
  performansi upita.
- Admin operacije koje zahtevaju pristup podacima svih tenanta moraju eksplicitno
  koristiti `IgnoreQueryFilters()`.
- Migracije ostaju jedinstvene i centralizovane — jedna EF migracija pokriva sve
  tenante.

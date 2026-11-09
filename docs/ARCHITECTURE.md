# Arhitektura — WashBookPro

## Uvod

WashBookPro je multi-tenant SaaS platforma za menadžment autopraonica.
Svaki klijent (autopraonica) je tenant koji deli isti deployment, ali ima
potpuno izolovane podatke.

## High-level arhitektura

Sistem je implementiran kao **modularni monolit**: jedan backend deployment,
interno podeljen u module po poslovnim domenima (vidi "Moduli backend-a").

Ovaj pristup je odabran umesto mikroservisa jer:
- Solo developer ne može da održava distribuirani sistem u ranoj fazi
- Modularnost unutar monolita omogućava kasniju ekstrakciju ako zatreba
- Jedan deployment znači jednostavniju infrastrukturu i niže troškove

## Komponente

| Komponenta    | Tehnologija              | Opis                                              |
|---------------|--------------------------|---------------------------------------------------|
| Backend API   | ASP.NET Core 10 (C#)     | REST API, poslovna logika, autentikacija          |
| Web aplikacija| Next.js 16, React 19     | Vlasnički dashboard, terminal, web rezervacije    |
| Mobilna app   | React Native + Expo      | Skeleton; rad odložen (ADR-029)                   |
| ANPR edge     | Python (PlateRecognizer) | Prepoznavanje tablica na ulazu/izlazu             |
| Baza          | PostgreSQL 16            | Deljena baza za sve tenante                       |
| Infrastruktura| Docker Compose           | Lokalni razvoj i produkcioni deployment           |

## Multi-tenancy

- Pristup: **shared database, shared schema**
- Svaki red u tabelama po tenantu ima kolonu `TenantId` (`Tenant` i
  `CustomerAccount` su globalni — mušterija nije vezana za jednu perionicu)
- Filtriranje po tenantima je na nivou aplikacije (EF Core global query filters)
- Entiteti po tenantu implementiraju `ITenantScoped` (ADR-004)
- Autorizovani endpointi: tenant iz JWT `tenant_id` claim-a preko `ITenantContext`
- Javni endpointi: tenant se resoluje po slug-u, upiti koriste `IgnoreQueryFilters()`
- PostgreSQL Row Level Security (RLS) **nije uveden**; ADR-002 ga navodi kao
  mogućnost, ali danas izolaciju obezbeđuje samo aplikacioni sloj

## Moduli backend-a

`backend/src/WashBookPro.Api/Modules/`: `Auth`, `Customers`, `Reservations`,
`Tenants` (aktivni), `Anpr`, `Billing`, `Notifications` (rezervisani za
kasnije faze).

## Napomena

Plan razvoja je u `docs/plan/WashBook-Plan-razvoja.md` (jedini važeći plan,
ADR-029). Odluke su u `docs/decisions/` (ADR-001 do ADR-029), a trenutno
stanje i sledeći koraci u `docs/PROJECT_STATE.md`. Dijagrami (sekvencijalni, ER) još
ne postoje.

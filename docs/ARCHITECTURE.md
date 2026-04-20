# Arhitektura — WashBookPro

## Uvod

WashBookPro je multi-tenant SaaS platforma za menadžment autopraonica.
Svaki klijent (autopraonica) je tenant koji deli isti deployment, ali ima
potpuno izolovane podatke.

## High-level arhitektura

Sistem je implementiran kao **modularni monolit**: jedan backend deployment,
interno podeljen u module po poslovnim domenima (reservations, subscriptions,
billing, notifications, anpr, tenants, auth).

Ovaj pristup je odabran umesto mikroservisa jer:
- Solo developer ne može da održava distribuirani sistem u ranoj fazi
- Modularnost unutar monolita omogućava kasniju ekstrakciju ako zatreba
- Jedan deployment znači jednostavniju infrastrukturu i niže troškove

## Komponente

| Komponenta    | Tehnologija              | Opis                                              |
|---------------|--------------------------|---------------------------------------------------|
| Backend API   | ASP.NET Core 9 (C#)      | REST API, poslovna logika, autentikacija          |
| Web aplikacija| Next.js 15               | Vlasnički dashboard, B2B portal, web rezervacije  |
| Mobilna app   | React Native + Expo      | Aplikacija za radnike i klijente                  |
| ANPR edge     | Python                   | Prepoznavanje tablica na ulazu/izlazu             |
| Infrastruktura| Docker Compose           | Lokalni razvoj i produkcioni deployment           |

## Multi-tenancy

- Pristup: **shared database, shared schema**
- Svaki red u bazi ima kolonu `TenantId`
- Filtriranje po tenantima je na nivou aplikacije (EF Core global query filters)
- PostgreSQL Row Level Security (RLS) je drugi sloj zaštite
- JWT token nosi `tenant_id` claim koji se validira pri svakom zahtevu

## Napomena

Detaljna tehnička arhitektura sa sekvencijalnim dijagramima, ER dijagramom
baze i opisom svakog modula dolazi u Fazi 0.3 (backend scaffold).

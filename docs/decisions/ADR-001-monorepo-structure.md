# ADR-001: Monorepo struktura bez monorepo toolinga

**Datum:** 2026-04-20
**Status:** Prihvaćeno

---

## Kontekst

WashBookPro se sastoji od više aplikacija: backend API, web frontend, mobilna
aplikacija i ANPR edge servis. Potrebno je odlučiti kako organizovati kod u
jednom ili više repozitorijuma i da li koristiti monorepo tooling (Turborepo,
pnpm workspaces, Nx).

## Odluka

Koristimo **jedan git repozitorijum** sa flat strukturom foldera (bez `apps/`
prefiksa i bez `packages/` sloja). Sve aplikacije su direktno u root-u:
`/backend`, `/web`, `/mobile`, `/anpr-edge`.

**Ne uvodimo monorepo tooling** u Fazi 0. Svaka aplikacija ima sopstveni
dependency management (NuGet za .NET, npm za Next.js i Expo, pip za Python).

## Razlozi

- Solo developer u ranoj fazi — monorepo tooling dodaje konfiguracionu
  kompleksnost bez trenutne koristi.
- Različiti stack-ovi po aplikaciji (.NET, Node, Python) otežavaju unified
  build pipeline.
- Flat struktura je dovoljno jasna i laka za navigaciju.
- Ako timski rast ili deljene biblioteke to zahtevaju, tooling se može uvesti
  kasnije bez restrukturiranja repozitorijuma.

## Posledice

- Svaka aplikacija se build-uje i testira nezavisno.
- Nema deljenih paketa u `/packages/` — kod koji je zajednički replicira se
  ili se izdvaja tek kad postane dovoljno stabilan.
- CI pipeline će imati odvojene job-ove po aplikaciji na osnovu `paths:` filtera.

# ADR-013: Docker Compose strategija za lokalni razvoj

**Datum:** 2026-04-22
**Status:** Prihvaćeno

## Kontekst

Potrebno je odlučiti kako pokretati ceo aplikacioni stack lokalno i u CI okruženju.
Opcije su: Docker Compose, Kubernetes (minikube), ili pokretanje servisa nativno.

## Odluka

Koristimo Docker Compose za orkestaciju svih servisa u lokalnom razvoju:

- PostgreSQL 16
- pgAdmin 4
- ASP.NET Core 10 backend
- Next.js 16 web aplikacija

## Razlozi

Docker Compose je odabran umesto Kubernetes-a jer solo developer u ranoj fazi
ne treba orkestrator — Kubernetes donosi operativnu kompleksnost koja nije
opravdana do većeg broja klijenata. Docker Compose je dovoljno moćan,
lako se razume i debuguje, a migracija na Kubernetes je moguća kasnije
bez promene aplikacionog koda.

Nativno pokretanje servisa je odbačeno jer zahteva ručnu konfiguraciju
PostgreSQL-a na svakom razvojnom računaru i ne garantuje konzistentno okruženje.

## Posledice

- Jedan fajl (`infra/docker-compose.yml`) pokreće ceo stack komandom `docker compose up -d`
- Svaka aplikacija ima sopstveni `Dockerfile` sa multi-stage buildom
- Backend i web imaju `.dockerignore` koji isključuje lokalne build artifakte
- `infra/.env` sadrži sve tajne za lokalni razvoj (gitignored)
- `infra/.env.example` je committovan template bez vrednosti
- Za svakodnevni razvoj preporučuje se nativno pokretanje (`dotnet run`, `pnpm dev`)
  jer je hot-reload brži; Docker Compose se koristi za integracijsko testiranje

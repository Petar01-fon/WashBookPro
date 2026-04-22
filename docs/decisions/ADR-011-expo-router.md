# ADR-011: Expo Router za mobilnu navigaciju

**Datum:** 2026-04-22
**Status:** Prihvaćeno

## Kontekst

Za mobilnu aplikaciju potrebno je rešenje za navigaciju između ekrana.
Glavne opcije su bile React Navigation (imperativni pristup) i Expo Router
(file-based routing, sličan Next.js App Router).

## Odluka

Koristimo Expo Router (file-based routing) za navigaciju u mobilnoj aplikaciji.

## Razlozi

- Konzistentnost sa Next.js App Router koji se već koristi na webu —
  isti mentalni model za rutu kao fajl.
- Expo Router je deo Expo ekosistema, što znači bolja integracija i
  manji konfiguracioni overhead.
- Podrška za deep linking i web output bez dodatne konfiguracije.
- React Navigation bi zahtevao manualno definisanje stack-ova i
  TypeScript tipova za svaku rutu.

## Posledice

- Struktura ekrana je vezana za folder strukturu unutar `app/` direktorijuma.
- Svaki fajl u `app/` automatski postaje ruta — treba voditi računa o
  imenovanju fajlova koji nisu ekrani (prefix `_` ih isključuje iz rutiranja).
- Migracija na React Navigation u budućnosti bi zahtevala restrukturiranje
  foldera i promenu svih navigacionih poziva.

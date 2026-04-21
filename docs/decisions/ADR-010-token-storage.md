# ADR-010: Čuvanje JWT tokena — localStorage za scaffold

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

JWT access token i refresh token moraju biti sačuvani na klijentu
nakon uspešnog logina. Postoje dva glavna pristupa: localStorage i
httpOnly cookie. Odluka se donosi u Fazi 0.6 pri izradi web scaffolda.

---

## Odluka

Za scaffold fazu (0.6) koristimo localStorage za čuvanje tokena.
Middleware dobija signal o autentikaciji kroz js-readable cookie
`washbook_authed` koji se postavlja nakon uspešnog logina.

---

## Razlozi

**localStorage je dovoljno za scaffold** — cilj Faze 0.6 je da dokažemo
da auth flow radi end-to-end, ne da implementiramo produkcijski nivo
bezbednosti.

**httpOnly cookie je bolji ali kompleksniji** — zahteva Next.js API
route kao BFF (Backend For Frontend) koji prima kredencijale, poziva
backend, i postavlja httpOnly cookie. Ova arhitektura dolazi u Fazi 1
kada se radi produkcijski auth flow.

**Dashboard aplikacija, ne javni sajt** — localStorage XSS rizik je
manji kada je aplikacija dostupna samo autentikovanim korisnicima,
za razliku od javnih sajtova.

---

## Posledice

- Token je vidljiv u browser DevTools — prihvatljivo za development
- XSS napad može ukrasti token iz localStorage — prihvatljivi rizik
  za scaffold, mora biti rešeno pre produkcije
- U Fazi 1 migrirati na httpOnly cookie via Next.js API route (BFF
  pattern) i ažurirati ovaj ADR statusom "Zamenjeno ADR-XXX"

# ADR-010: Čuvanje JWT tokena — localStorage za scaffold

**Datum:** 2026-04-21
**Status:** Prihvaćeno (revidirano 2026-05-07)

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

---

## Revizija — 2026-05-07

**Migracija nije izvršena u Fazi 1.** Ovo je dokumentovana odluka, ne
propust.

### Zašto je migracija odložena

Migracija je odložena iz kombinacije organizacionih i tehničkih razloga:

1. **Migracija nije imala vlasnika u Fazi 1.** Solo developer kapacitet je
   usmeren ka korisničkim funkcionalnostima — Service management, Customer
   auth flow, Landing page — koje proizvode merljivu korisničku vrednost.
   Tehnički dug u storage layer-u je svesno akumuliran kao trade-off za
   bržu isporuku user-facing capabilities-ja.

2. **Access token traje 15 minuta, refresh rotira pri svakoj upotrebi.**
   Prozor za zloupotrebu ukradenog tokena je ograničen. XSS koji ukrade
   token mora da ga iskoristi pre isteka, i gubi refresh token pri prvoj
   detekciji nevaljanog refresh-a.

3. **Platforma je pre-produkcijska.** Nema plaćajućih korisnika. Uvođenje
   arhitekturne složenosti radi bezbednosti pre nego što postoji ijedan
   napadnut korisnik nije opravdano troškom.

### Prihvaćeni kompromis

localStorage tokeni su izloženi XSS napadima. Ovo je svesno prihvaćen
rizik, dokumentovan ovde. Nije ignorisan.

Mitigacija koja postoji: kratki TTL access tokena (15 min), refresh token
rotacija, i činjenica da aplikacija ne rukuje finansijskim transakcijama
u ovoj fazi.

### Kada ponovo razmotriti

Migracija na httpOnly cookie postaje prioritet kada nastupi jedan od
sledećih uslova:

- Onboarduje se prvi B2B klijent (tenant sa fleet-om vozila i fakturama)
- Identifikuje se konkretan XSS vektor u aplikaciji
- Počinje implementacija online plaćanja (Faza 3) — finansijske operacije
  zahtevaju viši standard zaštite tokena
- Platforma dostigne 100+ aktivnih registrovanih kupaca koji aktivno
  koriste booking flow (ne samo na waitlist-i) — na toj skali,
  jedna kompromitovana sesija znači jedan stvaran oštećen korisnik

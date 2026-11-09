# ADR-029 — Strateški fokus: alat za perionice

**Status:** Prihvaćeno
**Datum:** 2026-11-09
**Autor:** Petar Bogdanović
**Zamenjuje:** ADR-026, ADR-028

## Kontekst

WashBook je pokušavao da bude četiri stvari odjednom: marketplace za
vozače, SaaS za perionice, B2B portal za flote i ANPR sistem protiv krađe.
ADR-026 je obim suzio na hibrid (jedna perionica i jedna flota kao pilot),
a ADR-028 je postavio strategiju dvostrane platforme. I posle toga plan je
imao više paralelnih tokova (flota pilot, landing redizajn, ANPR spike,
deploy) nego što jedan developer sa 20–40 sati nedeljno može da završi.

Dana 2026-11-09 usvojen je novi plan, `docs/plan/WashBook-Plan-razvoja.md`,
sa pratećim `docs/plan/WashBook-Plan-testiranja.md`. Ovaj ADR ga beleži kao
odluku i zamenjuje prethodne strateške ADR-ove.

## Odluka

### 1. Jedini važeći plan

`docs/plan/WashBook-Plan-razvoja.md` je jedini važeći plan razvoja.
Faze, sprintovi, obim i kapije se uzimaju odatle. Kad se neki drugi
dokument (ADR, `PROJECT_STATE.md`, stari planovi u git istoriji) razlikuje
od plana, važi plan. Plan se menja samo Petrovom odlukom, a promena
strateškog pravca dobija novi ADR.

### 2. Šta je WashBook u 2027.

Alat za vlasnike perionica: evidencija pranja, radnici, rezervacije i
kontrola novca. Glavna poruka: „Znaš tačno koliko je oprano i koliko je
naplaćeno, bez krađe." Plaća vlasnik perionice, mesečnom pretplatom po
lokaciji.

### 3. Vozači dolaze preko stranice perionice

Svaka perionica ima javnu stranicu `/book/[slug]` i deli je sama (link,
QR kod, Instagram). Nova perionica znači novog tenanta, ne novi kod.
Vozačima se ne obećavaju nove perionice, a vlasnicima novi kupci.

### 4. Faze

| Faza | Period | Cilj |
|---|---|---|
| A | 10. nov – 31. dec 2026 | Spremno za pilot: popravke, terminal (PIN), dashboard i presek kase, audit log, praćenje grešaka, produkcija i backup |
| B0 | 4. – 15. jan 2027 | Suva proba |
| B1 | 18. jan – 7. feb 2027 | Pilot na jednoj lokaciji, samo aplikacija |
| B2 | 8. feb – 14. mar 2027 | Pilot sa pasivnom ANPR kamerom |
| C | 15. mar – 30. apr 2027 | ANPR integracija |
| D | maj – avg 2027 | Prvi kupci: 5 aktivnih perionica, 2–3 plaćaju |
| E | od sep 2027 | Rast; odložene funkcije po okidačima |

Detalji i kapije su u planu.

### 5. Odloženo

| Stavka | Okidač za povratak |
|---|---|
| Marketplace za vozače (`/perionice`, mapa, pretraga, recenzije) | 20–30 aktivnih perionica |
| B2B portal, flote, eFaktura | Plaćeni kupac ga zatraži, najranije 2028. |
| Online plaćanje (AllSecure / Monri) | 10+ perionica koje plaćaju |
| Self-service onboarding, SuperAdmin, naplata pretplate u aplikaciji | ~10+ perionica |
| Mobilna aplikacija (Expo) | Konkretan razlog; web na tabletu i telefonu je dovoljan |
| SMS / Viber (Infobip) | Posle pilota, ako kupci ne vide email |
| Redizajn landing stranice | Nije u obimu faze A; vraća se novom odlukom |

### 6. Domen

Domen je `washbook.tech` (`app.` za web, `api.` za API). Može se promeniti
kasnije; do tada se u dokumentaciji koristi samo on.

### 7. Nove ideje

Svaka nova ideja ide u `docs/ideje.md`, ne u kod. Lista se pregleda jednom
mesečno.

## Šta se zamenjuje

**ADR-026 (pravac proizvoda do sezone 2027):** zamenjeni su hibridni
pravac sa flota pilotom, milestone-i M1–M4, model pretplate po broju
boksova i Hetzner kao hosting.

**ADR-028 (strategija dvostrane platforme):** zamenjen je prag za
pretragu (8–10 perionica u gradu postaje 20–30 aktivnih perionica).

Iz ova dva ADR-a u ovaj prelazi samo ono što je ponovljeno u tačkama 2,
3 i 5 iznad: prodaje se alat, ne kupci, vozači dolaze preko `/book/[slug]`,
a marketplace je odložen. Recenzije samo od evidentiranih pranja i
početak u manjem gradu (plan: prvo Niš, zatim Beograd) ostaju kao
kandidati za ADR o marketplace-u, kad se on vrati na sto.

## Razlozi

- Jedan developer sa 20–40 sati nedeljno može da završi jedan tok, ne
  četiri.
- Krađa radnika i nedostatak pregleda su problemi za koje vlasnik plaća i
  bez ijednog novog kupca.
- ANPR je najjači argument, ali se gradi tek kad pasivni test (B2)
  pokaže da kamera pouzdano čita tablice.
- Odložene funkcije imaju merljive okidače, pa se ne vraćaju zato što
  zvuče zanimljivo.

## Posledice

### Pozitivne

- Jedan dokument određuje šta se radi; nema više paralelnih planova.
- Svaka faza ima kapiju sa odlukom da li se ide dalje, menja ili staje.

### Negativne / kompromisi

- Flota pilot i landing redizajn, za koje je postojao plan, ne rade se.
- Proizvod se oblikuje prema jednoj perionici tokom pilota. Ublažavanje:
  razgovori sa najmanje 3 druge perionice tokom faze A.

### Obaveze

- ADR-026 i ADR-028 dobijaju status „Zamenjeno ADR-029".
- `CLAUDE.md` (Roadmap) i `docs/PROJECT_STATE.md` se usklađuju sa planom.
- Zastareli planski dokumenti (`docs/ROADMAP.md`, `docs/DEPLOY-PLAN.md`,
  `docs/LANDING-PLAN.md`) se brišu; ostaju u git istoriji.
- Ostali ADR-ovi (001–025, 027) i dalje važe, jer opisuju kod koji radi.

## Reference

- `docs/plan/WashBook-Plan-razvoja.md`
- `docs/plan/WashBook-Plan-testiranja.md`
- ADR-026, ADR-028 (zamenjeni)

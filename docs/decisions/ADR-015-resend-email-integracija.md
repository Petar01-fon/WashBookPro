# ADR-015: Resend integracija za transakcione emailove

**Datum:** 2026-04-28
**Status:** Prihvaćeno

## Kontekst

U Fazi 1.2 uvedena je email potvrda rezervacije. Potrebno je odlučiti:
1. Koji servis koristiti za slanje emailova
2. Odakle pozivati email servis — iz Next.js API route-a ili iz ASP.NET Core backend-a

## Odluka

Koristimo **Resend** kao email servis. Email se poziva isključivo iz **ASP.NET Core backend-a**,
ne iz Next.js-a.

## Razlozi

### Zašto Resend
- Jednostavan HTTP API, odlična dokumentacija
- Besplatan plan dovoljan za development i early production
- Podržava HTML emailove bez dodatnih biblioteka

### Zašto backend, ne Next.js API route
- Email je posledica poslovne operacije (kreiranje rezervacije) — prirodno pripada backend sloju
- Next.js API route bi zahtevao čuvanje Resend API key-a u web servisu, što komplikuje secret management
- Backend već ima sve podatke o rezervaciji u trenutku slanja — nema potrebe za dodatnim HTTP pozivom
- Konzistentno sa arhitekturom: web sloj je UI, backend je logika

### Zašto await sa try/catch, ne fire-and-forget
- Greška pri slanju emaila ne sme da poništi uspešno kreiranu rezervaciju
- Try/catch loguje grešku ali propušta `201 Created` response
- Jednostavnije od queue-based pristupa koji dolazi u Fazi 2 sa Infobip notifikacijama

## Implementacija

- `IEmailService` interfejs u `Common/Email/`
- `ResendEmailService` implementacija koristi `IHttpClientFactory`
- Email se šalje odmah pri kreiranju rezervacije (status `Pending`)
- Poruka: "Rezervacija primljena, čeka potvrdu"

## Posledice

- Resend API key mora biti prisutan u `infra/.env` i prosleđen backend kontejneru
- Na besplatnom planu bez verifikovanog domena, slanje je ograničeno na vlasnikov email
- Verifikacija domena (`washbookpro.rs`) planirana pre produkcijskog deploya
- Email pri promeni statusa u `Confirmed` planiran za Fazu 2 (Infobip)
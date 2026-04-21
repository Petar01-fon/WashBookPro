# ADR-008: Jedan tenant po korisniku za MVP

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

Multi-tenant platforma mora da odluči kako modeluje vezu između korisnika
i organizacija. Teorijski, jedan korisnik može pripadati više organizacija
(npr. knjgovođa koji vodi knjige za više firmi). Pitanje je da li u Fazi 0
implementiramo multi-org login flow ili pretpostavljamo jedan tenant po korisniku.

---

## Odluka

Jedan tenant po korisniku za MVP (Faze 0–2).

Konkretno:
- `User` entitet ima `TenantId` kao non-nullable FK — jedan korisnik, jedan tenant
- JWT login flow je jednokoračan: `POST /auth/login` → JWT sa `tenant_id` claimom → dashboard
- Nema koraka "odaberi organizaciju" u login flow-u
- Nema `UserOrganizations` junction tabele

---

## Razlozi

Analiza stvarnih korisničkih slučajeva:

| Tip korisnika | Tenant situacija | Učestalost |
|---------------|-----------------|------------|
| Vlasnik perionica | Jedna organizacija, više perionica unutar nje | Čest |
| B2B firma | Jedna organizacija (firma kao klijent) | Čest |
| Radnik | Jedna organizacija (gde radi) | Čest |
| B2C mušterija | Nema tenant vezu | Čest |
| Knjgovođa za više firmi | Više organizacija | ~1% |

Za ~99% korisnika, jedan tenant po korisniku je tačan model. Implementacija
multi-org login-a za 1% slučajeva u Fazi 0 dodaje kompleksnost bez vrednosti.

---

## Posledice

**Prednosti:**
- Jednostavan jednokorački login flow
- JWT token je samodostatan — nema dodatnih API poziva za određivanje tenanta
- Frontend i backend su jednostavniji za razumevanje i debugovanje

**Ograničenja koja prihvatamo:**
- Knjgovođe sa više klijenata ne mogu biti opsluženi bez migracije šeme
- Super Admin ne može "ući u tenant" bez posebnog mehanizma

**Plan za budućnost — NE implementirati sada:**

*Super Admin impersonation (verovatno Faza 3):*
Super Admin dobija privremeni JWT sa `tenant_id` ciljne organizacije.
Ovo je impersonation pattern — ne multi-org login flow.
`// TODO: Super Admin impersonation — dokumentovati u novom ADR kada zatreba`

*Multi-org korisnici (ako ikad zatreba):*
Migracija na `UserOrganizations` junction tabelu sa `IsActive` flagom
i `switch-organization` endpointom.
`// TODO: Multi-tenant user support — dokumentovati u novom ADR kada zatreba`

**Kriterijum za pregled ove odluke:**
Kada stvarni korisnik (ne pretpostavka) zatraži pristup više organizacija,
ili kada Super Admin support workflow zahteva impersonation funkcionalnost.

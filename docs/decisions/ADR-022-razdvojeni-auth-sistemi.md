# ADR-022 — Razdvojeni auth sistemi: Customer i Owner/Worker

**Datum:** 2026-05-07
**Status:** Prihvaćeno
**Faza:** 1.6

---

## Kontekst

WashBookPro ima tri tipa korisnika: B2C kupci koji rezervišu pranja,
vlasnici perionice koji upravljaju poslovanjem, i radnici koji opsluže
termine. Svaki tip ima strukturno drugačiji odnos sa platformom.

Tokom implementacije customer auth sistema (ADR-019), donesena je odluka
da se koristi poseban sistem za B2C kupce umesto proširivanja postojećeg
owner/worker auth sistema. Ova odluka zahteva eksplicitno dokumentovanje
jer stvara dva paralelna auth sistema u web klijentu — što je neočekivano
za developera koji ne poznaje kontekst.

---

## Odluka

Platforma koristi **dva odvojena, namerno razdvojena auth sistema**:

| Dimenzija | Customer auth (`customer-auth.ts`) | Owner/Worker auth (`auth.ts`) |
|---|---|---|
| Korisnici | B2C kupci | Vlasnici, Radnici |
| Backend entitet | `CustomerAccount`  (Modules/CustomerAuth/) | `User` ( Modules/Auth/,ITenantScoped) |
| Tenant veza | Nema — Customer može da rezerviše u bilo kojoj perionici | Tačno jedan tenant (ADR-008) |
| Tenant rezolucija | URL slug (`/book/[slug]`) | JWT claim (`tenant_id`) |
| Redirect target | `/`, `/profil`, `/book/[slug]` | `/dashboard`, `/terminal/[slug]` |
| Server-side guard | Ne — localStorage nije vidljiv middleware-u | Da — `washbook_authed` cookie + `proxy.ts` |
| Logout | `clearCustomerTokens()` u localStorage | `clearTokens()` + briše `washbook_authed` cookie |

### Strukturni pattern — "persona-based auth split"

Ovo je arhitekturni pattern prisutan u svim platformama koje imaju
strukturno različite tipove korisnika:

- **Uber**: Rider i Driver imaju odvojene app-ove, odvojene onboarding
  flow-ove, i odvojene backend entitete — rider rezerviše vožnju, driver
  prihvata vožnju, ali nikad isti korisnički nalog nije oba
- **DoorDash**: Customer, Dasher i Merchant — tri odvojena auth sistema
  jer svaki ima drugačije permisije, drugačiji redirect, i drugačiji
  poslovni odnos sa platformom
- **Calendly**: Booker (rezerviše termin) i Host (upravlja kalendarom)
  — strukturno isti kao Customer i Owner u WashBookPro

Zajednički razlog za split u svim ovim slučajevima: **permisioni model,
onboarding flow, i redirect target su toliko različiti da deljenje auth
sistema dodaje složenost umesto da je smanjuje.** Unified auth sistem bi
zahtevao složenu role-switching logiku, conditional redirecte, i hibridne
JWT payloade — sve to za malo konceptualni dobitak.

### Boundary pravila — koji fajl koristi koji sistem

**`web/lib/customer-auth.ts`** koristiti isključivo u:
- `web/app/auth/callback/page.tsx` — OAuth callback, čuva Customer tokene
- `web/app/book/[slug]/BookingFlow.tsx` — autofill profila u booking formi
- `web/app/login/customer/page.tsx` — Customer login forma
- `web/app/register/page.tsx` — Customer registracija
- `web/app/profil/layout.tsx` — Client-side route guard za `/profil`
- `web/app/profil/page.tsx` — Token rotacija nakon promene lozinke
- `web/components/landing/Nav.tsx` — Auth-aware nav (avatar, logout)
- `web/lib/profile-api.ts` — Autorizovani API pozivi za Customer profil

**`web/lib/auth.ts`** koristiti isključivo u:
- `web/app/(auth)/login/page.tsx` — Owner/Worker login forma
- `web/app/(dashboard)/dashboard/services/page.tsx` — Zaštićeni API pozivi
- `web/app/terminal/[slug]/TerminalView.tsx` — Worker terminal, logout
- `web/app/terminal/[slug]/WalkInDialog.tsx` — Walk-in rezervacija s tokenom
- `web/components/dashboard/DashboardSidebar.tsx` — Dashboard nav, logout

**Zabranjena mešavina:** nijedan fajl ne sme importovati i `customer-auth`
i `auth` istovremeno. Ako nova feature traži oba, to je signal za
arhitekturnu reviziju (videti sekciju "Kada razmotriti ujedinjenje").

---

## Posledice

**Pozitivne:**
- Svaki sistem je jednostavan i fokusiran — nema conditional logike
  za hibridne korisnike
- Izmena jednog sistema ne može da naruši drugi
- Boundary pravila su jasna i proverljiva grepping-om

**Negativne:**
- Dva storage namespace-a u localStorage (`washbook_customer_*` i
  `washbook_access_token`)
- Novi developer mora da razume split pre nego što napravi prvu izmenu
- Cross-system feature zahtevati će eksplicitnu koordinaciju ili refaktor

---

## Kada razmotriti ujedinjenje

Ujedinjenje postaje opravdano kada nastupi **konkretan signal**, ne
apstraktna "potreba za čistoćom":

1. **Dual-persona korisnik.** Pojavi se korisnik koji legitimno mora biti
   Customer i Owner istovremeno — na primer, vlasnik perionice koji
   rezerviše u tuđoj perionici kao privatni kupac. Danas je to nemoguće
   jer nalog ne može biti oba.

2. **Cross-domain feature.** Feature koji traži "prikaži sve rezervacije
   gde je korisnik bio Customer ILI Worker u bilo kojoj perionici" —
   zahteva unified identity jer trenutno nisu isti entitet u bazi.

3. **Unified security/audit zahtev.** Konkretan trigger: B2B klijent 
traži SOC 2 ili ISO 27001 audit i revizor zahteva jedinstveni identitet 
po korisniku, ili dolaze GDPR data subject requests koji moraju da pokriju 
oba sistema u jednom upitu, ili payments compliance (PCI DSS) traži unified 
user identity vezan za kartice

4. **Codebase migrišu istovremeno.** Kada implementacija jednog feature-a
 zahteva da više od dva fajla koordinišu state između Customer i
 Owner/Worker auth-a (npr. event listeners, zajednički context, 
 custom sync funkcije), to je signal da split više ne smanjuje složenost 
 — već je dodaje

Osećaj da "dva sistema izgledaju neuredna" nije validan trigger.

---

## Alternativa

**Proširivanje User entiteta da podrži i Customer rolu** razmatrano i
odbijeno. `User` entitet je `ITenantScoped` — vezan za tačno jedan tenant.
Customer mora da bude globalan (može da rezerviše u više perionice).
Uklanjanje tenant veze sa `User` bi narušilo multi-tenant izolaciju koja
je osnova arhitekture (ADR-004). Novi entitet `CustomerAccount` bez
`ITenantScoped` je jedino rešenje bez narušavanja modela.

**Unified JWT sa više rola** razmatran i odbijen. JWT koji nosi i
`tenant_id` (za Owner/Worker) i globalni identitet (za Customer) bio bi
hibridn i ambiguozan — svaki endpoint bi morao da razlikuje koji kontekst
je aktivan. Dve čiste vrste tokena su jasnije od jedne složene.

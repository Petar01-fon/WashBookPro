# ADR-002: Tehnološki stek

**Datum:** 2026-04-20
**Status:** Prihvaćeno

---

## Kontekst

Potrebno je odlučiti glavni tehnološki stek za ceo projekat pre nego što
počne implementacija. Odluka mora da uzme u obzir: iskustvo developera,
zahteve multi-tenant SaaS platforme, troškove infrastrukture i mogućnost
skaliranja.

## Odluka

Usvajamo sledeći stek:

| Sloj           | Tehnologija                                   |
|----------------|-----------------------------------------------|
| Backend API    | ASP.NET Core 9 (C#) sa Entity Framework Core  |
| Baza podataka  | PostgreSQL 16                                 |
| Web frontend   | Next.js 15 (React, TypeScript, Tailwind, shadcn/ui) |
| Mobilna app    | React Native + Expo (TypeScript)              |
| ANPR           | Python (PlateRecognizer API, za Fazu 2)       |
| Infrastruktura | Docker Compose + Hetzner VPS                  |

## Razlozi

**PostgreSQL umesto SQL Server:**
PostgreSQL je besplatan za produkciju bez licencnih troškova. Ima ugrađen
Row Level Security (RLS) koji je idealan za multi-tenant izolaciju na nivou
baze. JSON kolone omogućavaju fleksibilna polja bez schema migracija.
Industrijski je standard za SaaS projekte i ima odličnu podršku u EF Core.

**ASP.NET Core umesto Node.js backend-a:**
Developer već poznaje C# iz prethodnog projekta, što znači kraće vreme do
prve funkcionalne verzije. ASP.NET Core je zreo framework za enterprise SaaS
sa jakim tipiziranjem koje smanjuje runtime greške. Dobar ekosistem za
autentikaciju, autorizaciju i multi-tenancy.

**Next.js 15 umesto Vue/Svelte:**
React je industrijski standard sa najvećim talent pool-om. App Router pruža
SSR i SSG koji su potrebni za SEO na marketing delu sajta. Jedan framework
pokriva marketing sajt, vlasnički portal i B2C web rezervacije — nema
potrebe za zasebnim rešenjima.

**React Native + Expo umesto native iOS/Android:**
Jedna code base pokriva oba operativna sistema. Expo znatno olakšava
deployment i over-the-air ažuriranja. Solo developer ne može da održava dve
odvojene native code base u punom obimu.

**Docker Compose umesto Kubernetes:**
Solo developer u ranoj fazi ne treba orkestrator. Kubernetes donosi
operativnu kompleksnost koja nije opravdana do ~50 klijenata. Docker Compose
je dovoljan i lako se razume i debuguje.

## Posledice

- Developer mora da ojača znanje iz Next.js, React Native i EF Core — to su
  oblasti sa ograničenim prethodnim iskustvom.
- Multi-language monorepo zahteva više alata lokalno instaliranih: Node.js,
  .NET SDK 9, Python i Docker.
- CI/CD pipeline mora da pokrije tri tipa aplikacija (.NET, Node, Python) sa
  različitim build procesima.
- Sve tri aplikacije dele PostgreSQL instancu u Fazi 0, ali su dizajnirane
  za horizontalno skaliranje ako zatreba.

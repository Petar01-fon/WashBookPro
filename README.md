# WashBookPro

Multi-tenant SaaS platforma za autopraonice, sa tri tipa korisnika:
fizička lica (B2C), firme sa voznim parkom (B2B) i vlasnici perionica
(SaaS tenants).

## Šta je WashBookPro?

WashBookPro opslužuje tri različite grupe korisnika:

1. **Fizička lica (B2C)** — mušterije koje rezervišu pranje
   preko mobilne aplikacije ili weba, plaćaju gotovinom ili online
2. **Firme sa voznim parkom (B2B)** — kompanije koje upravljaju
   flotom vozila, sa grupnim rezervacijama i mesečnim fakturisanjem (eFaktura)
3. **Vlasnici perionica (SaaS tenants)** — preduzetnici koji vode
   sopstvene autopraonice na platformi, uz mesečnu pretplatu

Platforma pokriva: rezervacije i rasporede, pretplate i pakete,
ANPR (automatsko prepoznavanje tablica) za zaštitu od krađe usluge,
plaćanja i fakturisanje, obaveštenja klijentima (SMS, Viber, email),
i B2B fakturisanje.

## Tehnološki stek

| Sloj           | Tehnologija                   |
|----------------|-------------------------------|
| Backend API    | ASP.NET Core 9 (C#)           |
| Baza podataka  | PostgreSQL                    |
| Web frontend   | Next.js 16                    |
| Mobilna app    | React Native + Expo           |
| ANPR edge      | Python (PlateRecognizer)      |
| Infrastruktura | Docker Compose                |

## Struktura repozitorijuma

```
/backend        ASP.NET Core 9 API
/web            Next.js 15 web aplikacija
/mobile         React Native + Expo
/anpr-edge      Python ANPR servis
/docs           Arhitekturna dokumentacija
/infra          Docker Compose i deployment skripte
```

## Pokretanje projekta

Dokumentacija za pokretanje biće dodata po završetku Faze 0.8.

## Arhitekturne odluke

Sve arhitekturne odluke nalaze se u `/docs/decisions/` kao ADR fajlovi.

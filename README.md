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

| Sloj           | Tehnologija              |
| -------------- | ------------------------ |
| Backend API    | ASP.NET Core 9 (C#)      |
| Baza podataka  | PostgreSQL               |
| Web frontend   | Next.js 16               |
| Mobilna app    | React Native + Expo      |
| ANPR edge      | Python (PlateRecognizer) |
| Infrastruktura | Docker Compose           |

## Struktura repozitorijuma

```
/backend        ASP.NET Core 10 API
/web            Next.js 16 web aplikacija
/mobile         React Native + Expo
/anpr-edge      Python ANPR servis
/docs           Arhitekturna dokumentacija
/infra          Docker Compose i deployment skripte
```

## Pokretanje projekta

### Preduslovi

- Docker Desktop
- Node.js 20+ i pnpm
- .NET SDK 10

### Pokretanje celog stack-a (Docker)

```bash
cd infra
cp .env.example .env   # popuni vrednosti
docker compose up -d
```

Servisi:

- Web aplikacija: http://localhost:3000
- Backend API: http://localhost:8080/scalar/v1
- pgAdmin: http://localhost:5050

### Pokretanje za razvoj (nativno)

Backend:

```bash
cd backend/src/WashBookPro.Api
dotnet run --launch-profile http
```

Web:

```bash
cd web
pnpm dev
```

Mobile:

```bash
cd mobile
npx expo start
```

## Arhitekturne odluke

Sve arhitekturne odluke nalaze se u `/docs/decisions/` kao ADR fajlovi.

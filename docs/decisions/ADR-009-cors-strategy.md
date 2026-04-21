# ADR-009: CORS strategija — development vs produkcija

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

Next.js web aplikacija radi na `localhost:3000` a backend API na
`localhost:5033`. Browser blokira cross-origin zahteve bez eksplicitne
CORS konfiguracije na serveru. Problem se pojavio pri prvom testiranju
login forme u Fazi 0.6.

---

## Odluka

U development okruženju dodajemo `DevPolicy` u `Program.cs` koja
dozvoljava zahteve sa `http://localhost:3000`. Policy se primenjuje
samo kada je okruženje `Development`.

Za produkciju, CORS policy će dozvoljavati samo stvarnu domenu
platforme — definiše se u Fazi 0.8 kada se postavlja deployment.

---

## Razlozi

**Nije globalna wildcard politika** — dozvoljavamo samo tačno određeni
origin, ne `AllowAnyOrigin()`. Ovo je minimalna permisivnost potrebna
za lokalni razvoj.

**Odvojeno po okruženju** — `DevPolicy` ne sme da dođe u produkciju.
U Fazi 0.8 se dodaje produkcioni policy sa stvarnom domenom.

---

## Posledice

- Backend mora biti restartovan nakon izmene CORS konfiguracije
- Pre deploy-a u Fazi 0.8 obavezno dodati produkcioni CORS policy
  sa stvarnom domenom i ukloniti ili ograničiti `DevPolicy`
- `UseCors()` mora biti pozvan pre `UseAuthentication()` u middleware
  pipeline-u — redosled je bitan

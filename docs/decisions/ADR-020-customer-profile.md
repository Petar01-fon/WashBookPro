# ADR-020 — Customer profil: email, lozinka i token rotacija

**Status:** Prihvaćeno  
**Datum:** 2026-05-07  
**Autori:** Petar Bogdanović  

---

## Kontekst

Korisnici (CustomerAccount) imaju mogućnost prijave putem email/lozinka ili Google OAuth. Potrebno je dodati endpoint za izmenu email adrese i lozinke, uz jasnu politiku upravljanja sesijama.

---

## Odluke

### 1. Izmena lozinke — token rotacija (umesto 204)

**Odluka:** `PUT /auth/customer/me/password` vraća `200 OK` sa novim parom `{ accessToken, refreshToken }`.

**Razlog:** Sistem čuva samo jedan refresh token po korisniku (kolona u `CustomerAccount` tabeli, ne posebna tabela). Kad se lozinka promeni:

- Stari refresh token se briše (zamenjuje novim) — svi ostali uređaji su invalidovani.
- Uređaj koji je inicirao promenu dobija novi par tokena odmah u response-u.
- Frontend zamenjuje stare tokene novima u storage-u bez redirect-a na login.

Da je response ostao `204 No Content`, korisnik na uređaju koji je promenio lozinku bio bi odjavljen za 15 minuta (istekom access tokena) — loš UX koji kažnjava inicijatora promene.

**Alternativa razmatrana:** `204 No Content` + frontend inicira novi `POST /auth/customer/refresh`. Odbačeno jer zahteva dodatni round-trip i komplikuje frontend logiku.

### 2. Izmena email adrese — bez verifikacije (za sada)

**Odluka:** `PUT /auth/customer/me/email` direktno ažurira email bez slanja verifikacionog emaila.

**Razlog:** Email verifikacioni flow (token u URL-u, expiry, potvrda) je zasebna celina koja nosi značajan kompleksnost. Implementacija bi uključivala:
- Privremenu tabelu za pending-email-change tokene
- Email template za verifikaciju
- Endpoint koji prima token i ažurira email
- Expiry logiku

**Placeholder:** `// TODO: send verification email to new address in Faza 2` dodat u controller.

**Bezbednosni kompromis:** Izmena emaila zahteva potvrdu trenutne lozinke — ovo sprečava preuzimanje naloga u slučaju da napadač ima pristup sesiji.

### 3. Zaštita profilnih ruta (frontend)

**Odluka:** Svaka zaštićena ruta ima sopstveni `layout.tsx` koji proverava autentikaciju na klijentskoj strani.

**Razlog:** Next.js 16 App Router server komponente ne mogu pristupiti localStorage-u. Autentikacija se čuva u localStorage (ADR-010), pa se guard implementira u client komponentama unutar layout.tsx.

**Pattern:**
```tsx
// web/app/profil/layout.tsx
"use client";
useEffect(() => {
  if (!isCustomerLoggedIn()) router.push("/login/customer?returnTo=/profil");
}, []);
```

**Alternativa:** Middleware-based guard koristeći cookie. Odbačeno jer bismo morali duplikovati token storage (localStorage + cookie) — narušilo bi ADR-010.

### 4. JWT claims prošireni za CustomerAccount

**Odluka:** `GenerateAccessToken` sada uključuje `given_name`, `family_name` i `email` claims.

**Razlog:** Nav bar čita ime iz JWT tokena na klijentskoj strani bez API poziva — brže, bez loading stanja, bez mrežnog round-tripa. Token se ionako šalje uz svaki request, pa dodavanje 3 claim-a nema merljiv uticaj na veličinu.

---

## Posledice

- Sve aktivne sesije korisnika (drugi uređaji) se invaliduju pri promeni lozinke — ovo je dokumentovano ponašanje, ne bug.
- Email verifikacioni flow mora biti implementiran u Fazi 2 pre production deploya.
- Stari JWT tokeni izdati pre ovog ADR-a ne sadrže `given_name`/`family_name` claims — biće transparentno osveženi pri sledećem refresh ciklusu (15 min).

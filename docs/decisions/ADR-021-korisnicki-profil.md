# ADR-021 — Korisnički profil i izmene podataka

**Datum:** 2026-05-07
**Status:** Prihvaćeno
**Faza:** 1.6

---

## Kontekst

Po implementaciji customer auth sistema (ADR-019), registrovani B2C kupci
dobili su mogućnost kreiranja naloga. Sledeći korak je omogućiti korisnicima
da upravljaju sopstvenim podacima: ime, prezime, telefon, email adresa i
lozinka.

Profil stranica (`/profil`) mora biti zaštićena od neautorizovanog pristupa,
ali ne sme blokirati javni booking flow koji radi i bez naloga. Autentikacija
za profil stranicu koristi customer-auth sistem (localStorage), ne
server-side middleware koji štiti owner/worker dashboard.

Izmena email adrese i lozinke su bezbednosno-osetljive operacije koje
zahtevaju posebnu pažnju: potvrdu trenutne lozinke, sprečavanje preuzimanja
naloga, i konzistentnost JWT tokena nakon promene.

---

## Odluka

### Tri odvojena formulara umesto jednog

Profil stranica je podeljena u tri sekcije sa zasebnim formularima:

1. **Lični podaci** — ime, prezime, telefon (`PUT /auth/customer/me`)
2. **Email adresa** — nova email adresa + potvrda trenutnom lozinkom
   (`PUT /auth/customer/me/email`)
3. **Lozinka** — trenutna lozinka + nova lozinka + potvrda
   (`PUT /auth/customer/me/password`)

Svaki formular ima sopstveni submit dugme i nezavisno stanje. Korisnik
može da sačuva ime bez unošenja lozinke, i obrnuto.

### Zaštita rute na nivou layout-a

`/profil` je zaštićena client-side guard-om u `web/app/profil/layout.tsx`:

```tsx
useEffect(() => {
  if (!isCustomerLoggedIn()) router.push("/login/customer?returnTo=/profil");
}, [router]);
```

Guard je na layout nivou, ne na nivou stranice, jer Next.js App Router
konvencija omogućava da se buduće pod-rute unutar `/profil/` automatski
naslede isti guard bez ponavljanja koda.

### Potvrda lozinke za bezbednosno-osetljive izmene

I `PUT /auth/customer/me/email` i `PUT /auth/customer/me/password`
zahtevaju `currentPassword` polje. Razlog: napadač koji preuzme otvorenu
sesiju (otvoren laptop, ukradena sesija) ne sme biti u stanju da promeni
email i potom resetuje lozinku preko novog emaila. Potvrda trenutne
lozinke sprečava ovaj scenarijo. Standardna praksa (Google, GitHub, Stripe).

### Potvrda lozinke za izmenu email adrese

Promena email adrese zahteva trenutnu lozinku — sprečava takeover napad
gde napadač sa pristupom otvorenoj sesiji menja email i potom resetuje
lozinku preko novog email-a. Standardna praksa (Google, GitHub, Stripe).
Implementirano u `PUT /auth/customer/me/email` endpoint-u: backend
verifikuje trenutnu lozinku protiv stored hash-a pre nego što primeni
izmenu.

### Token rotacija na promenu lozinke

`PUT /auth/customer/me/password` vraća `200 OK` sa novim parom
`{accessToken, refreshToken}` umesto `204 No Content`. Frontend odmah
zamenjuje tokene u localStorage:

- Tekuća sesija ostaje aktivna — korisnik nije odjavljen
- Sve ostale sesije (drugi uređaji) postaju nevalidne pri sledećem
  refresh-u, jer je refresh token rotiran

### Email promena bez verifikacije

`PUT /auth/customer/me/email` primenjuje promenu odmah, bez verifikacionog
emaila na novu adresu. Ovo je svesna odluka: verifikacioni flow zahteva
token storage, expiry logiku i email template — zaseban feature set koji
nije prioritet u Fazi 1.6.

Kod sadrži `// TODO: send verification email in Faza 2` komentar.

---

## Posledice

**Pozitivne:**
- Svaki formular je nezavisan — korisnik ne može slučajno obrisati
  popunjena polja submittovanjem druge sekcije
- Validacija (React Hook Form + Zod) je izolovana po sekciji, greške
  su kontekstualne
- Token rotacija na promenu lozinke sprečava scenarije gde napadač
  promeni lozinku i zadrži aktivne sesije na svim uređajima

**Negativne:**
- Email promena bez verifikacije dozvoljava unos tuđe email adrese —
  rizik prihvatljiv pre Faze 2, ali postoji
- Client-side layout guard proizvodi kratak vizualni flash pre redirect-a
  jer localStorage nije dostupan tokom server-side render-a

---

## Alternativa

**Jedan kombinovani formular** odbijen je zbog UX konflikta: izmene
lozinke zahtevaju potvrdu trenutne lozinke, dok izmene ličnih podataka
ne zahtevaju ništa. Kombinovanjem bi formular uvek tražio lozinku za
svaku izmenu, što je neprihvatljivo za korisnike koji žele samo da
ažuriraju broj telefona.

**Server-side zaštita rute** nije primenjena jer bi zahtevala cookie-based
token storage što je trenutno odloženo (videti ADR-010 Revizija).
Layout-level client guard je dovoljan za trenutni trust model — svaki API
poziv nezavisno validira JWT na backend-u, tako da klijent guard služi
samo da spreči flicker i poboljša UX, ne kao security boundary. Stvarna
autorizacija je na backend-u.

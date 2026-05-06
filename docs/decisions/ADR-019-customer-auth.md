# ADR-019 — Customer autentifikacija (Google OAuth + email/lozinka)

**Datum:** 2026-05-06
**Status:** Prihvaćen
**Faza:** 2.1

---

## Kontekst

Do Faze 2, jedini korisnici sa nalogom su radnici i vlasnici perionica (`User` entitet, tenant-scoped). Mušterije su bile "gostujući" korisnici — samo ime, email i telefon čuvani kao deo rezervacije.

Uvođenje `CustomerAccount` entiteta omogućava mušterijama da imaju sopstveni nalog: uvid u istoriju rezervacija, brže buduće booking-e (podaci se auto-popunjavaju), i Single Sign-On putem Google-a.

---

## Arhitekturalne odluke

### 1. Dva odvojena entiteta za "korisnika"

| Entitet | Modul | Opseg | Svrha |
|---------|-------|-------|-------|
| `User` | `Auth` | Tenant-scoped | Radnici i vlasnici perionice |
| `CustomerAccount` | `Customers` | Globalni (bez `ITenantScoped`) | Registrovane mušterije platforme |
| `Customer` | `Reservations` | Tenant-scoped | Gostujući podaci po rezervaciji |

`CustomerAccount` je globalan jer mušterija može rezervisati pranje u više perionica (marketplace model). `User` je tenant-scoped jer radnik/vlasnik pripada tačno jednoj perionici.

Veza između `CustomerAccount` i `Customer` (guest zapisa): u kasnijoj iteraciji, pri pravljenju rezervacije od strane ulogovanog Customer-a, sistem pronalazi ili kreira `Customer` zapis unutar tog tenanta i vezuje ga za rezervaciju.

### 2. Google OAuth sa ExternalCookie intermediaries

Umesto direktnog vraćanja JWT-a iz Google callback-a (što nije moguće u redirect flow-u), koristi se intermedijarni cookie:

```
Browser → GET /auth/google
  → Challenge(GoogleDefaults) → redirect na Google consent
  → Google → GET /auth/google/callback  (middleware automatski obrađuje)
  → Cookie "ExternalCookie" se popunjava Google podacima
  → Redirect na GET /auth/google/complete
  → Controller čita ExternalCookie → kreira/ažurira CustomerAccount
  → Generiše JWT → briše ExternalCookie → redirect na frontend
```

`ExternalCookie` je kratkotrajna — postoji samo tokom trajanja OAuth razmene.

### 3. Odvojen refresh ciklus za Customer tokene

`CustomerAccount` ima sopstvene `RefreshToken` i `RefreshTokenExpiresAt`. Refresh token važi 30 dana (duplo duže od `User` refresh tokena koji važe 7 dana) jer su mušterije povremeni korisnici.

Endpoint: `POST /auth/customer/refresh` — identičan mehanizam kao `POST /auth/refresh` za User-e.

### 4. JWT claims za CustomerAccount

| Claim | Vrednost |
|-------|----------|
| `sub` | `CustomerAccount.Id` |
| `ClaimTypes.Role` | `"Customer"` |

Nema `tenant_id` clajma — Customer nije vezan za jedan tenant.

### 5. Mehanizam za Google-only naloge

Customer koji se registruje isključivo putem Google-a neće imati `PasswordHash`. Login putem email/lozinke za takav nalog vraća `401`. U budućnosti, može se dodati endpoint "Postavi lozinku" koji dopunjava `PasswordHash`.

---

## Alternativne opcije koje nisu odabrane

- **Jedinstven `User` entitet za sve** — odbačeno jer bi komplikovalo multi-tenancy; radnici/vlasnici su uvek vezani za tačno jedan tenant
- **Identity Server / Keycloak** — odbačeno; overkill za MVP fazu, uvodi eksternu zavisnost
- **Čisto manuelna Google OAuth implementacija (bez middleware-a)** — razmatrana, ali `Microsoft.AspNetCore.Authentication.Google` je stabilna i dobro testirana biblioteka

---

## Posledice

- Mušterije mogu kreirati nalog email/lozinkom ili Google-om
- Booking flow na webu i mobilnoj aplikaciji može prepoznati ulogovanog Customer-a i auto-popuniti podatke
- Refresh token traje 30 dana — mušterije ostaju prijavljene kroz duži period
- Potrebno: Google OAuth credentials (ClientId, ClientSecret) u `.env.local`

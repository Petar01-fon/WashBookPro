# ADR-018 — Upravljanje uslugama i auto-refresh token

**Datum:** 2026-05-06
**Status:** Prihvaćen
**Faza:** 1.5

---

## Kontekst

Vlasnik perionice mora imati mogućnost da definiše i upravlja uslugama koje nudi — naziv, trajanje, cenu, kategoriju vozila i tip usluge. Ove usluge se prikazuju u booking flowu za mušterije i moraju biti fleksibilne kako bi odgovarale različitim poslovnim modelima perionice.

Pored toga, web aplikacija je koristila kratkotrajna JWT access tokena (15 minuta) bez mehanizma za automatski refresh, što je dovodilo do neželjenih odjava korisnika.

---

## Donete odluke

### 1. Upravljanje uslugama iz owner dashboarda

Vlasnik perionice upravlja uslugama putem `/dashboard/services` stranice. Implementirani endpointi:

- `GET /services?tenantSlug=...` — javni, za booking flow mušterija
- `GET /services/manage` — samo za Owner ulogu, vraća sve usluge tenanta
- `POST /services` — kreiranje nove usluge
- `PATCH /services/{id}` — izmena postojeće usluge
- `DELETE /services/{id}` — soft deaktivacija (`IsActive = false`)

### 2. Soft delete strategija

Usluge se nikada fizički ne brišu iz baze. Umesto toga, postavljamo `IsActive = false`. Razlozi:

- Istorijske rezervacije ostaju konzistentne (strani ključevi ne pucaju)
- Vlasnik može ponovo aktivirati uslugu
- Izveštaji i statistike ostaju tačni za prošle periode

### 3. `VehicleCategory` i `ServiceType` kao slobodan string

`VehicleCategory` i `ServiceType` nisu enum vrednosti već slobodni stringovi. Razlozi:

- Različite perionice imaju različite kategorije (putnički, kombi, teretni, motocikl...)
- Nije moguće predvideti sve kombinacije u fazi dizajna
- Enum bi zahtevao migraciju baze svaki put kada vlasnik želi novu kategoriju

### 4. Seed strategija — 6 default usluga

Pri prvom pokretanju tenanta, sistem automatski seed-uje 6 default usluga:

| Naziv | Trajanje | Cena |
|-------|----------|------|
| Spoljašnje pranje | 30 min | 1.200 RSD |
| Unutrašnje čišćenje | 45 min | 1.800 RSD |
| Kompletno pranje | 60 min | 2.800 RSD |
| Poliranje | 120 min | 5.000 RSD |
| Pranje motora | 45 min | 2.200 RSD |
| Nano zaštita | 90 min | 4.500 RSD |

Vlasnik može izmeniti ili deaktivirati bilo koju od ovih usluga, ili dodati nove.

### 5. Auto-refresh token u `apiFetch`

Access token ima kratak životni vek (15 minuta). Implementiran je automatski refresh mehanizam u `apiFetch` funkciji:

1. Svaki zahtev šalje se sa trenutnim access tokenom
2. Ako server vrati `401`, poziva se `tryRefresh()` koja šalje refresh token na `/auth/refresh`
3. Ako refresh uspe, originalni zahtev se automatski ponavlja sa novim tokenom
4. Ako refresh ne uspe (token istekao ili nevažeći), korisnik se odjavljuje i preusmerava na `/login`

Ovaj mehanizam je transparentan za ostatak aplikacije — sve API funkcije koje koriste `apiFetch` automatski dobijaju refresh logiku bez izmena.

---

## Alternativne opcije koje nisu odabrane

- **Enum za kategorije** — odbačeno zbog krutosti i potrebe za migracijom pri svakoj promeni
- **Hard delete** — odbačeno zbog integriteta istorijskih podataka
- **Refresh samo pri učitavanju stranice** — odbačeno jer korisnik može ostati na istoj stranici duže od 15 minuta

---

## Posledice

- Vlasnici perionice imaju potpunu kontrolu nad uslugama iz UI-a
- Booking flow uvek prikazuje samo aktivne usluge
- Sesija korisnika je stabilna i ne zahteva ručno osvežavanje stranice

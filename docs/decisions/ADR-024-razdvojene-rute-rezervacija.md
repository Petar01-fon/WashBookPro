# ADR-024 — Razdvojene rute za rezervacije: Customer i Walk-in

**Datum:** 2026-05-08
**Status:** Predloženo
**Faza:** 1.8

---

## Kontekst

WashBookPro ima dva strukturno različita načina kreiranja rezervacije:

1. **Customer/guest rezervacija** — javno dostupna, korisnik dolazi sa booking flow-a (`/book/[slug]`), nije autentikovan ili je autentikovan kao Customer. Rezervacija dobija status `Pending` dok radnik ne potvrdi dolazak.

2. **Walk-in rezervacija** — kreira radnik ili vlasnik sa terminala (`/terminal/[slug]`), uvek za konkretnog kupca koji je fizički prisutan. Rezervacija dobija status `Confirmed` odmah jer je prisustvo verifikovano.

Oba flow-a trenutno gađaju isti endpoint `POST /reservations`. Razlika između njih određuje se poljem `CreatedBy` u request body-ju — klijent šalje string `"Customer"` ili `"Worker"`. Na osnovu te vrednosti server:
- bira kako da resoluje `TenantId` (iz URL slug-a ili iz JWT konteksta)
- postavlja inicijalni `Status` rezervacije (Pending ili Confirmed)

Ovo stvara tri međusobno povezana problema.

---

### Problem 1 — Bezbednost

`POST /reservations` nema `[Authorize]` atribut ni `[AllowAnonymous]`. Ruta je javno dostupna bez ikakvog auth middleware-a.

Autorizacija za walk-in scenario vrši se u application kodu, ne u auth sloju:

```
if (request.CreatedBy == "Worker")
{
    if (_tenantContext.TenantId is null)
        return Unauthorized();
    tenantId = _tenantContext.TenantId.Value;
}
```

Ovo radi "slučajno ispravno": neautentikovan korisnik koji pošalje `createdBy: "Worker"` dobiće 401 jer `_tenantContext.TenantId` neće biti popunjen bez JWT tokena. Međutim, server **ne proverava da li JWT role zaista sadrži `Worker`**. Worker provera je implicitna posledica toga što `TenantId` u JWT contextu postoji samo uz validan token, ali nije eksplicitna policy. Autentikovan Customer ne može da pošalje `createdBy: "Worker"` i dobiće Unauthorized, ali razlog je greška u resoluciji tenanta, ne odbijanje zbog nedostatka role.

### Problem 2 — DTO confusion

`CreateReservationRequest` DTO nosi polje `createdBy: "Customer" | "Worker"` koje:
- klijent slobodno popunjava,
- server slepo čita bez krstaste provere sa JWT tokenom,
- ima semantičku težinu (utiče na `Status` rezervacije i na način resolucije tenanta).

Rezultat: klijentski kod mora da zna "magic string" vrednost i da je eksplicitno postavi. Oba frontend fajla hardkoduju ovu vrednost:
- `BookingFlow.tsx:111` — `createdBy: "Customer"`
- `WalkInDialog.tsx:87` — `createdBy: "Worker"`

Ovo je obrnuto od ispravnog dizajna — ko kreira rezervaciju treba da bude zaključeno iz auth konteksta na serveru, ne primljeno od klijenta.

### Problem 3 — Data integritet

`CreatedBy` se čuva u `Reservation` entitetu kao `TEXT NOT NULL` kolona (prisutna od migracije `20260423105019_AddReservationModule`). Vrednost se popunjava direktno iz request body-ja:

```
CreatedBy = request.CreatedBy ?? "Customer"
```

Dakle, klijent kontroliše audit polje koje se trajno čuva u bazi. Guest korisnik može poslati bilo koji string i on će biti upisan u `CreatedBy`. Ovo je problem data integriteta — audit polje treba biti server-driven.

---

## Razmatrane opcije

### Opcija A — Status quo

Zadržati jedan endpoint sa `CreatedBy` flag-om. Opcija koja ne zahteva izmene.

**Prednosti:**
- Nula implementacionog troška

**Mane:**
- Sva tri identifikovana problema ostaju
- Security bug ostaje neadresiran i nevidljiv — nema `[Authorize]` atributa koji bi signalizovao intentionalnu security odluku

---

### Opcija B — Razdvojene rute (preporučeno)

Kreirati dva posebna endpoint-a sa eksplicitnom autorizacijom i posebnim DTO-ima:
- `POST /reservations` — javni, za guest/customer
- `POST /reservations/walk-in` — zaštićen, samo Worker/Owner

`CreatedBy` se ne prima od klijenta — server postavlja vrednost na osnovu toga koji endpoint je pozvan.

**Prednosti:**
- Autorizacija je na nivou middleware-a, vidljiva, eksplicitna
- Svaki endpoint ima DTO koji odražava tačno šta taj use case zahteva (walk-in ne treba `TenantSlug` jer ga dobija iz JWT-a)
- Server-driven `CreatedBy` — klijent više ne može da utiče na audit polje
- Čitljivost: developer koji vidi `[Authorize(Roles = "Worker,Owner")]` odmah razume nameru

**Mane:**
- Dva endpoint-a umesto jednog
- Dva DTO-a umesto jednog
- Frontend mora da promeni URL za walk-in
- Nova migracija za promenu `CreatedBy` iz string u enum

---

### Opcija C — Jedan endpoint sa pravom auth proverom

Zadržati jedan `POST /reservations`, ali dodati eksplicitnu role proveru unutar metoda. Server bi proverio `User.IsInRole("Worker")` pre nego što prihvati walk-in logiku.

**Prednosti:**
- Manji broj promena od Opcije B
- Nema potrebe za novim DTO-om

**Mane:**
- Magic string u DTO-u ostaje — klijent i dalje šalje `createdBy`
- Autorizacija ostaje u application kodu umesto u middleware-u — ne vidljiva pri pregledu rute
- `CreatedBy` popunjavanje i dalje dolazi od klijenta (delimično rešen problem 3)

---

## Odluka

Odabrana **Opcija B — razdvojene rute**.

### Novi potpisi

**`POST /reservations`**
- Auth: `[AllowAnonymous]` (eksplicitno, da se signalizira intentionalna javna dostupnost)
- Request: `CreateReservationRequest { TenantSlug, BayId, ServiceId, CustomerName, CustomerPhone, CustomerEmail, StartsAt, Notes? }`
- Server postavlja: `Status = Pending`, `CreatedBy = ReservationCreatedBy.Customer`
- TenantId: resoluje se iz `TenantSlug`

**`POST /reservations/walk-in`**
- Auth: `[Authorize(Roles = "Worker,Owner")]`
- Request: `WalkInRequest { BayId, ServiceId, CustomerName, CustomerPhone, CustomerEmail, StartsAt, Notes? }`
- Server postavlja: `Status = Confirmed`, `CreatedBy = ReservationCreatedBy.Worker`
- TenantId: iz JWT `_tenantContext.TenantId`

### Promena tipa za `CreatedBy`

`CreatedBy` kolona ostaje u bazi — korisna je kao audit polje (ko je kreirao rezervaciju). Tip se menja iz `TEXT` u enum:

```
ReservationCreatedBy { Customer = 0, Worker = 1 }
```

Migracija konvertuje postojeće `"Customer"` → `0` i `"Worker"` → `1`. Polje se više ne prima od klijenta ni na jednom endpoint-u — isključivo server-driven.

### Frontend izmene

| Fajl | Promena |
|------|---------|
| `web/lib/booking-api.ts` | Ukloniti `createdBy` iz `CreateReservationPayload` interface-a |
| `web/lib/terminal-api.ts` | `createWalkIn()` da gađa `POST /reservations/walk-in`; ukloniti `createdBy` iz `WalkInPayload` |
| `web/app/book/[slug]/BookingFlow.tsx` | Ukloniti `createdBy: "Customer"` iz request objekta |
| `web/app/terminal/[slug]/WalkInDialog.tsx` | Ukloniti `createdBy: "Worker"` iz request objekta |

GET response-i koji vraćaju `createdBy` (u `TerminalReservation` i `ReservationItem` interfejsima) zadržavaju polje — read-only prikaz, dolazi sa servera kao enum string reprezentacija.

### Redosled implementacije

1. Backend: novi enum `ReservationCreatedBy`, izmena entiteta, nova migracija, novi DTO-ovi, razdvajanje metoda u kontroleru
2. Frontend: izmene u `booking-api.ts`, `terminal-api.ts`, `BookingFlow.tsx`, `WalkInDialog.tsx`
3. Manualni test sva četiri flow-a: guest rezervacija, Customer rezervacija, Worker walk-in, dashboard prikaz

Sve izmene idu u jedan commit kao logička celina.

---

## Posledice

**Pozitivne:**
- Security bug adresiran — autorizacija za walk-in je u middleware-u, ne u application kodu
- `[AllowAnonymous]` na public endpoint-u je eksplicitan signal da je javna dostupnost namerna, ne zaboravljena
- `CreatedBy` u bazi je sada audit polje čiju vrednost klijent ne može da falsifikuje
- Svaki endpoint ima minimalan DTO — nema polja koja nisu relevantna za taj use case

**Negativne:**
- Nova migracija menja tip kolone za sve postojeće rezervacije (procenjeno: mala operacija, baza je u ranoj fazi bez produkcijskog volumena)
- Izmene u 4 frontend fajla i 2 backend fajla — potrebno testirati sve relevantne flow-ove

---

## Otvorena pitanja

**Da li `ReservationCreatedBy` enum treba proširiti u budućnosti?**
Trenutno ima dve vrednosti: `Customer` i `Worker`. B2B fleet bookings (Faza 2+) mogu zahtevati `FleetManager` vrednost. API key integracije mogu zahtevati `ApiClient` ili sličnu vrednost. Enum je lako proširiv bez migracije tipa — samo nova vrednost.

Odluka o proširivanju se odlaže do konkretnog zahteva u odgovarajućoj fazi.

---

## Veza sa drugim odlukama

- **ADR-022** — Razdvojen auth sistem za Customer i Owner/Worker definiše tokene koji se ovde koriste za autorizaciju na `/reservations/walk-in`
- **ADR-004** — Multi-tenant izolacija: `TenantId` za walk-in dolazi isključivo iz JWT konteksta, nikad iz request body-ja

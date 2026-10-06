# P2-PLAN.md — plan za P2: Result tip i email signal

**Napravljeno:** 2026-10-06 (HEAD `6f57435`). **Status:** odobren od strane Petra, nije započet.
Privremeni fajl — kada se P2 završi, obrisati ga u istom commitu kao ažuriranje
`docs/PROJECT_STATE.md`.

## Cilj P2

1. **Result tip** — kreiranje rezervacije trenutno vraća `null` iz tri različita razloga
   (usluga ne postoji, boks ne postoji, termin zauzet), i sva tri postaju
   **409 "The selected time slot is no longer available"**. Frontend 409 tumači kao
   `SLOT_TAKEN` i vraća kupca na korak 2 — pogrešno kad problem nije termin.
   Cilj: svaki ishod ima svoj HTTP odgovor.
2. **Neaktivni boks/usluga** — kreiranje ne proverava `IsActive`, pa direktan POST
   verovatno može rezervisati neaktivan boks ili uslugu. Rešava se *samo ako Gate 0 to potvrdi*.
3. **Email signal** — `ResendEmailService` guta svaku grešku i vraća `Task` bez rezultata;
   success stranica **uvek** kaže "Potvrda je poslata na vašu email adresu." Na Resend
   free planu email zapravo stiže samo na adresu vlasnika Resend naloga, pa je poruka
   danas netačna za skoro sve kupce. Cilj: backend vraća `emailSent`, stranica prikazuje
   iskrenu poruku.

## Odluke koje je Petar već doneo (ne menjati)

- Result tip je **lokalan** u `ReservationsController` (partial klasa): mali enum ishoda +
  record. **Bez** generičkog `Result<T>`, bez novog fajla u `Common/`.
- Neaktivan boks/usluga se tretira **isto kao nepostojeći** (isti ishod, isti HTTP odgovor) —
  samo ako Gate 0 potvrdi bag.
- Kad email ne uspe, success stranica prikazuje (tačan tekst):
  **"Rezervacija je primljena. Potvrdu nismo uspeli da pošaljemo emailom — sačuvajte ovu
  stranicu ili dodajte termin u kalendar."**

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`. Ukratko:

- **Gate po gate.** Posle svakog gate-a STANI: pokaži pun sadržaj svakog izmenjenog fajla
  (kao tekst u odgovoru), izlaz build-a/tsc-a i doslovan izlaz provere. Čekaj odobrenje.
  Za veliki `ReservationsController.cs` pokaži pune izmenjene metode + novi tip, i `git diff`
  za taj fajl.
- **Jedan commit po gate-u koji menja kod**, tek posle odobrenja. Conventional Commits,
  jednolinijski `git commit -m "..."`, **bez AI atribucije**. Nema push-a.
- **Ne radi ništa van ovog plana.** Uočeno van plana se prijavljuje, ne popravlja.
- **Ne pretpostavljaj — dokaži.** Nalepi pravi izlaz komandi, HTTP odgovora, SQL-a i logova.
- **Booking integritet:** ne diraj konflikt-upit, buffer logiku, generisanje slotova u
  `GetAvailability`, ni "Locked Decisions" iz `CLAUDE.md` (kreiranje namerno nema buffer;
  enum-i se serijalizuju kao int).
- Razgovor sa Petrom na srpskom (latinica). Kod i identifikatori na engleskom.

---

## Okruženje i zamke

- Docker je kanonski, komande iz `/infra/`. Backend `http://localhost:8080`, web `:3000`.
  **Nikad** `dotnet run` na 5033.
- Posle izmene backend-a: `cd infra && docker compose up --build -d backend`;
  posle izmene web-a: `docker compose up --build -d web`. Čekaj `/health` 200 (`curl --retry`), ne `sleep`.
- Baza: `docker exec washbook-postgres psql -U washbook -d washbookpro -c '...'`
  (više `-c`, `-1`, `-v ON_ERROR_STOP=1`; heredoc ne radi bez `-i`; stringovi `$$tekst$$`;
  `set timezone='UTC';` pre čitanja `timestamptz`).
- `jq` nije instaliran. JWT: `sed -E 's/.*"accessToken":"([^"]+)".*/\1/'`.
- Git Bash: `MSYS_NO_PATHCONV=1` za putanje unutar kontejnera. curl exit 23 = greška pri
  upisu izlaza (npr. `| head`), ne greška servera.
- Backend log: `docker logs washbook-backend --since 2m 2>&1 | grep -iE "resend|email|fail|exception"`.
- Backend radi u Development → 500 vraća stack trace u telu.
- Privremeni fajlovi i tokeni u scratchpad sesije, nikad u repo.

### Fiksni dev podaci (posle P1)

| Šta | Vrednost |
|---|---|
| Tenant `dev-wash` | `80b059d6-c10f-47a6-8296-797009d5aa3d` |
| Owner / Worker | `owner@devwash.local` / `Owner123!`, `worker@devwash.local` / `Worker123!` |
| Bay 1 | `b0000000-0000-4000-8000-000000000001` |
| Usluga "Kombi — obično pranje" (60 min) | `5e000000-0000-4000-8000-000000000005` |
| Usluge 1–6 | `5e000000-0000-4000-8000-00000000000[1-6]` |

### Test podaci za P2

- Datum **2026-12-15** (CET, UTC+01:00), ime `P2 TEST`, email `p2test@example.com`
  (Resend će ga odbiti — to je namerno, to je slučaj "email nije poslat").
- Test boks (neaktivan): `b0000000-0000-4000-8000-0000000000f1`, ime `P2 TEST BAY`.
- Test usluga (neaktivna): `5e000000-0000-4000-8000-0000000000f1`, ime `P2 TEST SERVICE`, 60 min.
- Nepostojeći ID za testove: `00000000-0000-4000-8000-000000000999`.
- Ubacivanje test boksa i usluge (samo u gate-ovima koji ih traže):
  ```bash
  docker exec washbook-postgres psql -U washbook -d washbookpro -v ON_ERROR_STOP=1 -1 \
   -c 'insert into "Bays"("Id","TenantId","Name","IsActive") values ($$b0000000-0000-4000-8000-0000000000f1$$,$$80b059d6-c10f-47a6-8296-797009d5aa3d$$,$$P2 TEST BAY$$,false);' \
   -c 'insert into "Services"("Id","TenantId","Name","VehicleCategory","ServiceType","DurationMinutes","PriceRsd","IsActive") values ($$5e000000-0000-4000-8000-0000000000f1$$,$$80b059d6-c10f-47a6-8296-797009d5aa3d$$,$$P2 TEST SERVICE$$,$$Car$$,$$Basic$$,60,1000,false);'
  ```
- Čišćenje (posle svakog gate-a koji pravi podatke):
  ```bash
  docker exec washbook-postgres psql -U washbook -d washbookpro -v ON_ERROR_STOP=1 -1 \
   -c 'delete from "Reservations" where "CustomerId" in (select "Id" from "Customers" where "Name"=$$P2 TEST$$);' \
   -c 'delete from "Reservations" where "BayId"=$$b0000000-0000-4000-8000-0000000000f1$$ or "ServiceId"=$$5e000000-0000-4000-8000-0000000000f1$$;' \
   -c 'delete from "Customers" where "Name"=$$P2 TEST$$;' \
   -c 'delete from "Bays" where "Id"=$$b0000000-0000-4000-8000-0000000000f1$$;' \
   -c 'delete from "Services" where "Id"=$$5e000000-0000-4000-8000-0000000000f1$$;' \
   -c 'select (select count(*) from "Bays") bays, (select count(*) from "Services") services, (select count(*) from "Reservations") reservations, (select count(*) from "Customers" where "Name"=$$P2 TEST$$) p2_customers;'
  ```
  Na početku Gate 0 zabeleži broj boksova, usluga i rezervacija; posle čišćenja moraju biti isti
  (očekivano: 1 boks, 6 usluga; rezervacije — koliko ih je bilo na početku).

---

## Gate 0 — empirijska provera (bez izmene koda, bez commita)

Javni body za `POST /reservations`:
```json
{"tenantSlug":"dev-wash","serviceId":"<SVC>","bayId":"<BAY>","startsAt":"<T>","customerName":"P2 TEST","customerPhone":"+381600000021","customerEmail":"p2test@example.com"}
```
Koristi različite termine 2026-12-15 da se testovi međusobno ne sudaraju (npr. 08:00Z, 10:00Z, 12:00Z…).

| # | Slučaj | serviceId / bayId | Očekivano danas (bag) |
|---|---|---|---|
| 1 | nepostojeća usluga | `…000999` / Bay 1 | 409 |
| 2 | nepostojeći boks | usluga 5 / `…000999` | 409 |
| 3 | neaktivan boks | usluga 5 / `…0000f1` (test boks) | 201? |
| 4 | neaktivna usluga | `5e…0000f1` / Bay 1 | 201? |
| 5 | stvarni konflikt | isti zahtev kao uspešan, ponovljen | 409 (ispravno) |
| 6 | email | uspešan zahtev iz #5 | 201; u logu Resend greška za `p2test@example.com`; telo odgovora nema info o emailu |
| 7 | availability za neaktivnu uslugu | `GET /availability?date=2026-12-15&serviceId=5e000000-0000-4000-8000-0000000000f1&tenantSlug=dev-wash` | 200 sa slotovima? |
| 8 | walk-in nepostojeća usluga | `POST /reservations/walk-in` (owner token), usluga `…000999` | 409 |

Za #6 nalepi i relevantne linije backend loga (`Resend API returned …`).
Pročitaj i `web/app/book/[slug]/success/page.tsx` (~linija 116) i potvrdi da tekst o emailu ne zavisi ni od čega.

**Izlaz:** tabela sa stvarnim rezultatima. Ako #3/#4 vrate 201 → IsActive provera ulazi u Gate 1.
Ako ne → izostavi je iz Gate 1 i navedi zašto. Ako #7 vrati slotove → stavka 3 u Gate 1 ulazi.
Čišćenje na kraju.

---

## Gate 1 — Result tip za kreiranje rezervacije (+ IsActive ako je Gate 0 potvrdio)

**Fajl:** `backend/src/WashBookPro.Api/Modules/Reservations/ReservationsController.cs`

1. Dodati u klasu (pored ostalih privatnih helpera):
   ```csharp
   private enum CreateReservationOutcome { Created, ServiceNotFound, BayNotFound, SlotTaken }

   private sealed record CreateReservationResult(
       CreateReservationOutcome Outcome,
       Reservation? Reservation = null);
   ```
   (U Gate 2 se ovaj record proširuje sa `EmailSent` — ne dodavati sada.)
2. `CreateReservationCoreAsync` vraća `Task<CreateReservationResult>` umesto `Task<Reservation?>`:
   - usluga nije nađena → `ServiceNotFound`
   - boks nije nađen → `BayNotFound`
   - konflikt → `SlotTaken`
   - uspeh → `Created` + rezervacija
   - **Ako je Gate 0 potvrdio #3/#4:** u postojeće upite dodati `&& s.IsActive` (usluga) i
     `&& b.IsActive` (boks). Neaktivno = nije nađeno, isti ishod.
   - Konflikt-upit, računanje `endsAt`, kreiranje `Customer`-a, upis i email blok ostaju **isti**.
3. **Samo ako je Gate 0 #7 vratio slotove:** u `GetAvailability` u upit za uslugu (~linija 50)
   dodati `&& s.IsActive`, tako da neaktivna usluga daje postojeći `NotFound("Service not found")`.
   Ništa drugo u `GetAvailability` se ne dira.
4. `Create` i `CreateWalkIn` mapiraju ishod u odgovor (pomoćna metoda ili `switch` — po izboru,
   ali jedno mesto za mapiranje):
   - `ServiceNotFound` → `NotFound("Service not found")` (isti tekst kao u `GetAvailability`)
   - `BayNotFound` → `NotFound("Bay not found")`
   - `SlotTaken` → `Conflict("The selected time slot is no longer available")` (tekst nepromenjen)
   - `Created` → `StatusCode(201, new { id, status = (int)reservation.Status })` (oblik nepromenjen)

**Frontend:** ne menja se u ovom gate-u. `booking-api.ts` 404 već tretira kao opštu grešku
("Greška pri slanju rezervacije"), a 409 i dalje kao `SLOT_TAKEN` — što je sada tačno.

**Provera** (posle `dotnet build` + rebuild backend-a): ponovi Gate 0 #1–#5 i #8 (+ #7 ako je rađen).
Očekivano: #1 404 "Service not found", #2 404 "Bay not found", #3/#4 404 (ako je IsActive uključen),
#5 201 pa 409, #8 404, #7 404. U bazi nema rezervacija za neaktivni boks/uslugu. Čišćenje.

**Commit:** `fix(reservations): distinguish not-found from slot conflict when creating reservations`

---

## Gate 2 — email signal u backend-u

1. `backend/src/WashBookPro.Api/Common/Email/IEmailService.cs`:
   `Task SendBookingConfirmationAsync(...)` → `Task<bool> SendBookingConfirmationAsync(...)`.
   Dodati kratak komentar: `true` = Resend je prihvatio poruku (2xx); ne znači da je isporučena.
2. `ResendEmailService.cs`: vrati `true` na 2xx, `false` na ne-2xx i u `catch`.
   **Postojeće logovanje ostaje** (`LogWarning` za ne-2xx, `LogError` za izuzetak) — ne gušiti.
3. `ReservationsController.cs`:
   - `CreateReservationResult` dobija `bool EmailSent = false`.
   - U email bloku `CreateReservationCoreAsync`: `emailSent = await _emailService.Send...(...)`;
     postojeći `catch` (npr. greška pri čitanju tenanta) ostavlja `emailSent = false` i zadržava `LogError`.
   - Odgovor `Created` za **oba** endpointa: `new { id, status = (int)reservation.Status, emailSent }`.
     (Walk-in UI to polje za sada ignoriše — namerno, van plana.)
4. Nema drugih implementacija `IEmailService` (proveri `grep -rn "IEmailService" backend/src --include=*.cs`,
   ignoriši `/obj/`); ako ih ima — stani i prijavi.

**Provera:**
- `dotnet build` → 0 errors.
- `POST /reservations` sa `p2test@example.com` → 201, telo sadrži `"emailSent":false`; u logu Resend greška.
- **Pozitivan slučaj:** pitaj Petra za email adresu vlasnika Resend naloga (jedina na koju free plan šalje).
  Pošalji rezervaciju na nju → 201, `"emailSent":true`, Petar potvrdi da je email stigao.
  Ako Petar ne želi ili adresa nije dostupna, jasno napiši da pozitivan slučaj **nije proveren**.
- Walk-in → 201 sa `emailSent` poljem.
- Čišćenje.

**Commit:** `feat(email): report whether the booking confirmation email was accepted`

---

## Gate 3 — email signal na web-u

1. `web/lib/booking-api.ts`:
   - `ReservationResult` trenutno opisuje polja koja backend **ne vraća** (`serviceName`, `startsAt`,
     `customerName`, …) — backend vraća samo `{ id, status }` (+ sada `emailSent`). Proveri da se ta
     polja nigde ne koriste (`grep -rn "ReservationResult\|createReservation" web/app web/lib`),
     pa tip uskladi sa stvarnim odgovorom: `{ id: string; status: number; emailSent: boolean }`.
     Ako se neko od starih polja koristi — stani i prijavi.
2. `web/app/book/[slug]/ConfirmationStep.tsx`: uzmi rezultat `createReservation(...)` i dodaj
   query parametar `emailSent` (`"1"` ili `"0"`) u postojeći `URLSearchParams` za success stranicu.
   Email adresa i dalje **ne ide** u URL (postojeći komentar o PII ostaje).
3. `web/app/book/[slug]/success/page.tsx`:
   - pročitaj `emailSent` iz `searchParams` (dodaj u tip `Props`)
   - `emailSent === "1"` → postojeći tekst "Potvrda je poslata na vašu email adresu."
   - inače (uključujući nedostajući parametar) → tačno:
     "Rezervacija je primljena. Potvrdu nismo uspeli da pošaljemo emailom — sačuvajte ovu stranicu ili dodajte termin u kalendar."
   - isti stil kao postojeći paragraf (`--wb-*` tokeni, bez novih boja).

**Provera:**
- `cd web && pnpm exec tsc --noEmit` → bez grešaka; `pnpm lint` → bez novih grešaka u izmenjenim fajlovima.
- Rebuild web-a.
- Ceo booking flow u browseru na `/book/dev-wash` sa `p2test@example.com` → success stranica prikazuje
  "nismo uspeli" tekst; URL sadrži `emailSent=0` i **ne** sadrži email.
- Ako je Gate 2 pozitivan slučaj rađen: isto sa Petrovom adresom → "Potvrda je poslata…", `emailSent=1`.
  Inače otvori success URL ručno sa `emailSent=1` samo da se vidi prikaz, i napiši da je to vizuelna provera.
- Čišćenje.

**Commit:** `feat(booking): show honest email status on the booking success page`

---

## Gate 4 — dokumentacija

1. Predloži ažuriranje `docs/PROJECT_STATE.md`:
   - zaglavlje: P0–P2 završeni, sledeći P3 (čeka Petrov nalog)
   - sekcija P2: ZAVRŠEN, commit-i po gate-ovima, rezultati Gate 0
   - "Sledeće" premesti na kraj sekcije P2
   - u P4 dodaj ADR kandidata: "Kreiranje rezervacije: 404 za nepostojeću/neaktivnu uslugu ili boks,
     409 samo za zauzet termin; odgovor sadrži `emailSent`"
   - napomena: walk-in UI ignoriše `emailSent` (kandidat za kasnije)
2. `CLAUDE.md` se menja samo ako je nešto iz P2 postalo trajno pravilo — predloži, ne menjaj sam.
   (`CLAUDE.md` je na engleskom.)
3. Obriši `docs/P2-PLAN.md` u istom commitu.
4. Pokaži izmenjene delove, čekaj odobrenje.

**Commit:** `docs: close P2 and update project state`

---

## Posle P2

Ne počinji P3 bez Petrovog naloga.

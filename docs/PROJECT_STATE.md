# PROJECT_STATE.md — WashBookPro

**Poslednje ažuriranje:** 2026-05-07
**Aktivan developer:** Solo (Petar Bogdanović)
**Trenutna faza:** Faza 1 završena — aktivan razvoj Faze 2

> Za istoriju implementiranih funkcionalnosti videti `docs/ROADMAP.md`.
> Ovaj dokument fokusira se na **trenutno stanje i sledeće korake**.

---

## Trenutno stanje

Faza 1 (MVP) je završena. Platforma ima booking flow, worker terminal, owner
dashboard, services management, Customer auth + profil, i landing stranicu.
Aktivan tenant za razvoj: **dev-wash** (ID: `80b059d6-c10f-47a6-8296-797009d5aa3d`).

---

## Šta je sledeće

### 1. Booking flow redesign — medium-large

Trenutni 4-koračni paginirani flow treba da postane single-page wizard sa
sidebar sumarijem (izabrana usluga, datum, slot) vidljivim u realnom vremenu.

**Zašto prioritet:** Svaki korak u paginiranom flowu je potencijalni drop-off.
Single-page format smanjuje percipiranu složenost i povećava konverziju,
posebno na mobilnom uređaju. Detaljan plan nacrtan u chat istoriji.

### 2. ANPR spike — medium, visoka neizvesnost

Validacija da PlateRecognizer API radi sa stvarnim kamerama u prijateljevoj
perionici. Cilj: jedna detektovana tablica → event na backend → prikaz na
terminalu. ADR piše se tokom spike-a.

**Zašto prioritet:** ANPR je primarni tehnički diferencijator. Dok god nije
potvrđen u realnom okruženju, B2B i fleet feature mogu biti buildani na
pogrešnoj pretpostavci.

### 3. Onboarding 2-3 nepoznatih tenanta — non-tech, high impact

Onboarding vlasnika perionica bez tehničkog iskustva otkriće friction u
signup procesu i booking flowu koji dev-wash ne može da pokrije.

**Zašto prioritet:** Jedan aktivan tenant nije market fit validacija. Nepoznati
korisnik otkriva probleme pre nego što B2B ili fleet feature dobiju prioritet.

---

## Otvorena pitanja

**B2B fleet vs. many small tenants** — Platforma može ići ka intenzivnoj
akviziciji malih perionica (niži ARPU, brže zatvaranje) ili ka B2B fleet
managementu za kompanije sa flotama (visok ARPU, duži ciklus prodaje). Odluka
utiče na prioritizaciju B2B portala, eFaktura integracije i fleet ANPR feature-a.
Nije donesena.

**Resend production setup** — Trenutna konfiguracija šalje sa development naloga
na studentskom emailu. Pre onboardinga prvog eksternog tenanta: prebaciti na
lični nalog, verifikovati custom domain, testirati isporuku na neregistrovane
adrese. Nije bloker za razvoj, jeste bloker za prvi realni tenant.

---

## Deferred (i zašto)

- **Mobilna app (Expo)** — čeka stabilan web booking flow; mobile i web moraju
  biti konzistentni, preuranjeni build znači duple izmene pri svakom flow rewrite-u.
- **SMS/Viber (Infobip)** — čeka eksplicitnu potražnju plaćajućeg tenanta;
  implementacija pre potražnje je preuranjena optimizacija.
- **B2B portal** — čeka razrešenje otvorenog pitanja pravca (videti gore).

---

## Ključni fajlovi za novu sesiju

- **Auth** — `web/lib/customer-auth.ts` i `web/lib/auth.ts` (dva odvojena sistema — ADR-022)
- **API klijent layer** — `web/lib/{api,booking-api,dashboard-api,profile-api}.ts`
- **Design tokens** — `web/app/globals.css` (komentar `/* WashBook tokens */`)
- **Booking flow** — `web/app/book/[slug]/` (redesign pending)
- **Backend moduli** — `backend/src/.../Modules/{Auth,CustomerAuth,Reservations,Tenants}/`
- **Dev tenant** — ID `80b059d6-c10f-47a6-8296-797009d5aa3d`, slug `dev-wash`

---

## Česti razvojni zadaci

| Zadatak | Komanda / URL |
|---------|---------------|
| Pokretanje okruženja | `docker compose up --build -d` iz `/infra/` |
| Backend Scalar API docs | `http://localhost:8080/scalar/v1` |
| pgAdmin | `http://localhost:5050` |

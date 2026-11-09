# WashBook — Plan testiranja

**Verzija:** 1.0 · **Datum:** 9. novembar 2026 · **Status:** usvojeno
**Prateći dokument:** `WashBook-Plan-razvoja.md`

---

## 1. Šta želimo da dokažemo

Testiranje nije samo traženje bagova. Pilot treba da odgovori na šest pitanja. Ako odgovori budu „ne“, to je jednako vredna informacija.

| # | Hipoteza | Kako merimo | Cilj | Faza |
| --- | --- | --- | --- | --- |
| H1 | Radnici unose svako pranje | Pranja u sistemu u odnosu na kasu i brojanje vlasnika | ≥ 80% (cilj 95%) | B1 |
| H2 | Sistem pokazuje razliku u novcu | Dnevna razlika sistem vs kasa | Vlasnik vidi i može da objasni svaku razliku | B1 |
| H3 | Kupci zakazuju online | Broj online rezervacija nedeljno | Rast iz nedelje u nedelju (tačan cilj dogovoriti sa drugom na početku) | B1–B2 |
| H4 | Kamera pouzdano čita tablice | Tačnost na ručno proverenom uzorku | ≥ 90% danju, posebno meriti noć i kišu | B2 |
| H5 | Kamera otkriva neevidentirana pranja | Vozila sa kamere bez unosa, posle provere vlasnika | Vlasnik potvrđuje da su nalazi stvarni | B2 |
| H6 | Vlasnik bi platio | Direktno pitanje i iznos | „Da“ za 30–70 € mesečno | Kraj B2, faza D |

---

## 2. Nivoi testiranja

| # | Nivo | Kada | Ko |
| --- | --- | --- | --- |
| 1 | Automatski testovi | Tokom faze A, pokreću se na svaki push | Ti |
| 2 | Ručna provera na uređaju | Kraj faze A (sprint A4) | Ti |
| 3 | Suva proba (B0) | 4. – 15. jan 2027 | Ti i drug |
| 4 | Pilot B1, samo aplikacija | 18. jan – 7. feb 2027 | Radnici, drug, ti |
| 5 | Pilot B2, pasivna kamera | 8. feb – 14. mar 2027 | Radnici, drug, ti |
| 6 | Gate review | 15. mar 2027 | Ti i drug |
| — | Razgovori sa drugim perionicama | Paralelno, nov – feb | Ti |

---

## 3. Automatski testovi (faza A)

Cilj **nije** visoka pokrivenost koda. Testira se samo ono što bi u pilotu napravilo stvarnu štetu: curenje podataka, pogrešno vreme, izgubljen novac.

**Alati:** xUnit + `WebApplicationFactory` + Testcontainers (prava PostgreSQL baza u Dockeru). Pokretanje na svaki push kroz postojeći CI.

| Oblast | Šta test proverava |
| --- | --- |
| Izolacija tenanta | Korisnik perionice A ne može da vidi niti menja podatke perionice B, i to se proverava za **svaki** staff endpoint |
| Uloge | Kupčev JWT dobija 403 na staff endpointima. Radnik ne vidi ono što je samo za vlasnika |
| Vreme | Rezervacija u 08:00 po Beogradu ostaje 08:00 bez obzira na zonu servera. Postoji test za dan prelaska na letnje vreme |
| Dostupnost termina | Nema dvostruke rezervacije istog mesta. Istovremeni zahtevi daju 409 |
| Audit log | Svaki unos, izmena i storniranje pranja upisuje zapis. Pranje ne može da nestane bez traga |
| Dnevni presek | Zbir po načinu plaćanja jednak je zbiru pojedinačnih pranja, a stornirana pranja ne ulaze u zbir |
| Kupci | Isti broj telefona u istoj perionici ne pravi novog kupca |
| PIN radnika | Pogrešan PIN ne daje pristup, a pranje se uvek upisuje na prijavljenog radnika |

**Frontend (ako stigneš):** 2 E2E testa u Playwright-u. Prvi prolazi celo online zakazivanje od početka do kraja, drugi unos walk-in pranja na terminalu. Ako ne stigneš, ručna lista iz poglavlja 4 je obavezna.

---

## 4. Ručna provera na uređaju (sprint A4)

Radi se na **istom tabletu** koji je na perionici, ili na istom modelu.

- [ ] Ekran je čitljiv na dnevnom svetlu
- [ ] Tasteri su dovoljno veliki za mokre prste
- [ ] Unos pranja traje manje od 20 s (izmeri štopericom 10 unosa)
- [ ] Aplikacija radi sa slabim Wi-Fi-jem i sa mobilnim internetom
- [ ] Prekid interneta usred unosa: podaci ostaju i poruka je jasna
- [ ] Tablet ostavljen uključen ceo dan: proveriti šta se dešava sa sesijom i PIN-om
- [ ] Javna stranica testirana na 2–3 telefona (Android i iPhone), sa zakazivanjem do kraja
- [ ] Mejl potvrde stiže u inbox na Gmail-u i Outlook-u, ne u spam
- [ ] QR kod sa pulta otvara pravu stranicu

---

## 5. Suva proba B0 (4. – 15. januar 2027)

**Ko:** ti i drug, a ako može i jedan radnik.
**Gde:** na produkcijskom serveru, sa test perionicom. Idealno na samoj lokaciji, van radnog vremena.

| ID | Scenario | Očekivani rezultat |
| --- | --- | --- |
| S1 | Kupac zakaže online | Rezervacija se pojavi kod radnika, a kupcu stigne mejl |
| S2 | Kupac dođe bez rezervacije | Walk-in unos traje manje od 20 s |
| S3 | Kupac sa rezervacijom kasni 20 min ili ne dođe | Radnik može da označi „nije došao“, termin se oslobađa |
| S4 | Kupac otkaže | Termin se oslobađa |
| S5 | Radnik pogrešno unese cenu, pa je ispravi | Izmena je vidljiva u audit logu |
| S6 | Radnik stornira pranje | Sistem traži razlog, a vlasnik vidi storniranje |
| S7 | Promena smene na istom tabletu | Novi radnik se prijavi PIN-om, a pranja idu na pravu osobu |
| S8 | Internet pada na 10 minuta tokom rada | Jasna poruka, ništa se ne gubi, rezervni proces je poznat |
| S9 | Kraj dana: vlasnik unese stanje kase sa namernom razlikom od 500 din | Razlika se jasno vidi u dashboardu |
| S10 | Greška na serveru | Sentry obaveštenje stiže tebi za par minuta |
| S11 | Server je nedostupan | Uptime monitor javlja, a vraćanje iz backupa je probano na test bazi |
| S12 | Gužva: 15 unosa za 30 minuta | Bez usporenja i bez duplih unosa |

**Kapija B0 → B1:** svi scenariji prolaze, nema otvorenih P0 ni P1 bagova, a drug kaže „radnici mogu ovo“.

---

## 6. Pilot B1: samo aplikacija (18. jan – 7. feb 2027)

### Pre početka

**Početno stanje (baseline).** Zapisati sa drugom **pre prvog dana**, inače kasnije nema sa čim da se poredi:

- [ ] Prosečan broj pranja dnevno i nedeljno (iz kase ili postojeće evidencije)
- [ ] Koliko drug misli da gubi mesečno i na osnovu čega
- [ ] Koliko kupaca zakazuje telefonom, a koliko dolazi bez najave
- [ ] Koliko se čeka u gužvi (procena)

**Priprema:**

- [ ] Obuka radnika, 15 minuta, sa uputstvom na pultu
- [ ] Rezervni proces: sveska na lokaciji, ako sistem ne radi
- [ ] Link i QR kod za zakazivanje postavljeni na Instagram, Google Maps profil i pult
- [ ] Radnici pisano obavešteni o novom načinu evidencije

### Prva dva dana

Ti si na licu mesta. **Gledaš i zapisuješ gde radnici zapnu**, a ne pomažeš odmah. Jedan sat posmatranja vredi više od nedelju dana nagađanja.

### Svakodnevno (5 minuta)

- Sentry: ima li novih grešaka?
- Dnevni presek: broj unosa u odnosu na kasu

### Nedeljno

- Poziv sa drugom od 30 minuta (agenda u poglavlju 11)
- Nedeljni izveštaj (šablon u poglavlju 11)
- Ispravke po ozbiljnosti (poglavlje 10)

### Razgovor sa radnicima (posle 1. i 3. nedelje)

Razgovaraj **bez vlasnika u prostoriji**, jer radnici inače neće reći istinu o alatu koji služi i kao kontrola.

1. Šta ti najviše smeta pri unosu?
2. Kad nisi uneo pranje, zašto?
3. Šta bi promenio?

### Odluka posle B1

| Rezultat | Šta radimo |
| --- | --- |
| ≥ 80% pranja uneto, nema blokirajućih bagova | Prelazimo na B2 (kamera) |
| 60–80% | Nedelja ili dve ispravki procesa i UX-a, pa B2 |
| < 60% | Stajemo i razgovaramo sa drugom. Problem je u procesu ili motivaciji, ne u tehnici, i kamera ga neće rešiti |

---

## 7. Pilot B2: pasivna kamera (8. feb – 14. mar 2027)

Kamera **samo beleži** tablice. U aplikaciji nema novog ekrana. Cilj je da se izmeri da li kamera radi i koliko otkriva, pre nego što se uloži u integraciju.

### Priprema (tokom B1)

- [ ] Proverena cena PlateRecognizer-a za očekivani broj očitavanja
- [ ] Izabrana kamera koja čita tablice vozila u pokretu
- [ ] Određena pozicija: ulaz, ugao, visina i osvetljenje noću
- [ ] Postavljeno obaveštenje o video nadzoru na ulazu
- [ ] Radnici pisano obavešteni o kameri
- [ ] Određen rok čuvanja snimaka
- [ ] Python skripta: snimak → PlateRecognizer → zapis (vreme, tablica, pouzdanost, slika) u bazu ili CSV

> Pravna napomena: tablice i snimci su lični podaci, a nadzor zaposlenih mora biti najavljen. Ovo je opšta smernica, ne pravni savet. Za tekst obaveštenja i dogovor o obradi podataka konsultovati pravnika.

### Tačnost kamere (nedelje 4–5 pilota)

- [ ] Ručno proveriti uzorak od 50 očitavanja danju i 50 noću ili po kiši: da li je tablica tačno pročitana?
- [ ] Posebno proveriti slova **Š, Đ, Č, Ć, Ž**, strane tablice, prljave tablice i vozila koja idu jedno iza drugog
- [ ] Ako je tačnost niska, prvo pomeriti kameru ili dodati svetlo, pa tek onda donositi zaključke

### Uparivanje (nedeljno, nedelje 5–8 pilota)

**Pravilo:** tablica koju je kamera videla treba da ima uneto pranje iste tablice u roku od oko 2 sata od ulaska.

| Kategorija | Značenje | Šta se radi |
| --- | --- | --- |
| **A: poklapa se** | Sve je u redu | — |
| **B: kamera videla, nema unosa** | Moguće neevidentirano pranje, ili vozilo koje nije došlo na pranje (radnik, dostava, okretanje) | Vlasnik proverava svaki slučaj, a lista izuzetaka se dopunjuje |
| **C: unos bez kamere** | Kamera je promašila ili je radnik pogrešno uneo tablicu | Poboljšati tačnost kamere ili validaciju unosa tablice |

**Ključna brojka za prodaju:** broj potvrđenih slučajeva iz kategorije B × prosečna cena pranja = **otkriveni gubitak**.

### Kriterijum posle B2

- Tačnost čitanja ≥ 90% danju
- Vlasnik potvrđuje da su nalazi iz kategorije B stvarni

---

## 8. Gate review (15. mart 2027)

Ti i drug, sat vremena. Prolazite kroz sve hipoteze iz poglavlja 1 i donosite odluku.

| Odluka | Kada |
| --- | --- |
| **Dalje na fazu C** | H1 i H4 su ispunjene, a vlasnik želi da plati (H6) |
| **Ponoviti ili promeniti** | Hipoteze su delimično ispunjene; definisati šta se menja i koliko traje drugi krug |
| **Stati ili promeniti pravac** | Radnici ne koriste aplikaciju ni posle ispravki, ili vlasnik ne vidi vrednost |

Zapisnik se čuva u `docs/pilot/gate-review-2027-03.md`.

---

## 9. Razgovori sa drugim perionicama (paralelno, nov – feb)

Cilj je najmanje 3 perionice van druga. **Ovo nije prodaja nego učenje**, i ne pokazuješ aplikaciju dok ne čuješ njihove probleme.

1. Kako danas vodite evidenciju pranja?
2. Da li znate koliko pranja dnevno stvarno uradite? Kako to znate?
3. Da li ste imali problem sa radnicima i novcem? Koliko vas to košta, okvirno?
4. Koliko kupaca zakazuje unapred i na koji način?
5. Šta ste do sada probali (sveska, Excel, neki program)? Zašto ste odustali?
6. Da li biste platili 50 € mesečno za alat koji pokazuje tačan broj pranja i novca? Ako ne, koliko?
7. Da li biste pristali na kameru na ulazu?

Odgovore beleži u tabelu. Ako dve od tri perionice kažu da taj problem nemaju, to treba znati pre faze D.

---

## 10. Ozbiljnost bagova

| Nivo | Značenje | Rok |
| --- | --- | --- |
| **P0** | Blokira rad perionice ili gubi podatke | Isti dan, uz obaveštenje drugu |
| **P1** | Smeta, ali postoji zaobilazni put | U toku nedelje |
| **P2** | Kozmetika ili sitnica | Na listu, kad stigneš |

---

## 11. Šabloni

### Nedeljni izveštaj

```
Nedelja: ____ (od – do)

PRANJA
U sistemu: ____ | Po kasi/vlasniku: ____ | % uneto: ____

NOVAC
Sistem: ____ din | Kasa: ____ din | Razlika: ____ din
Objašnjenje razlike:

REZERVACIJE
Online: ____ | Telefonom: ____ | Nisu došli: ____

KONTROLA
Storniranja: ____ | Izmene cena: ____

KAMERA (samo B2)
Očitano vozila: ____ | A: ____ | B: ____ | C: ____
Potvrđeni slučajevi iz B: ____ | Procenjen gubitak: ____ din

BAGOVI
P0: ____ | P1: ____ | P2: ____

Šta je zapelo:
Šta menjamo sledeće nedelje:
```

### Agenda nedeljnog poziva (30 minuta)

1. Brojke iz izveštaja (5 min)
2. Šta je smetalo radnicima (10 min)
3. Šta vlasnik vidi, a šta mu fali (10 min)
4. Dogovor za sledeću nedelju (5 min)

### Tabela problema

| Datum | Ko je prijavio | Opis | Ozbiljnost | Status |
| --- | --- | --- | --- | --- |
| | | | | |

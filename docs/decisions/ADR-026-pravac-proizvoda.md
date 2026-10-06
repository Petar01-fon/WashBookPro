# ADR-026 — Pravac proizvoda do sezone 2027

**Status:** Prihvaćeno
**Datum:** 2026-10-06
**Autor:** Petar Bogdanović

## Kontekst

Faza 0 (temelji) i Faza 1.1–1.4 (rezervacije API, booking flow, worker
terminal, vlasnički dashboard) su završene. Sanacija P0–P2 je zatvorena:
korektnost zavisna od vremenske zone, determinizam dev okruženja i
ishodi kreiranja rezervacije (404/409, `emailSent`).

Prvobitni `docs/ROADMAP.md` (Faze 2–4) planira mnogo paralelnih tokova:
ANPR, B2B portal sa samouslužnom registracijom, SMS/Viber, mobilnu
aplikaciju u punom obimu, online plaćanja, eFaktura, onboarding i
pretplatnu naplatu. Za jednog developera to nije izvodljivo u istom
periodu, a nijedan od tih tokova nema konkretnog korisnika koji ga čeka.

Konkretan korisnik postoji: prijateljeva perionica. Postoji i rok, sezona
u proleće 2027. Ovaj ADR beleži pravac koji je odlučen 2026-10-06, da bi
se rad do sezone vodio prema jednom cilju umesto prema listi funkcija.

## Odluka

### 1. Strateški pravac: hibrid sa po jednim pilotom

Jedna perionica radi na platformi kao SaaS tenant, a jedna firma sa
flotom je B2B pilot. Onboarding novih tenanta dolazi posle sezone.

### 2. Cilj i rok

Do proleća 2027 prijateljeva perionica radi svaki dan na WashBook-u u
produkciji. Prijatelj počinje najkasnije 4–6 nedelja pre sezone, da se
problemi otkriju pre najveće gužve.

### 3. Model pretplate

Tenant plaća fiksnu mesečnu pretplatu. Cena zavisi od broja boksova, a
ANPR se naplaćuje kao doplata. Iznosi još nisu definisani (vidi
"Otvorena pitanja").

### 4. ANPR

- Spike posle P2, paralelno sa ostalim radom, u `anpr-edge/`.
- Koriste se postojeće IP kamere perionice (RTSP), bez novog hardvera
  u prvoj verziji.
- **v1:** nepoklapanje tablice sa rezervacijom ili walk-in unosom se
  loguje i prikazuje u dnevnom izveštaju na dashboardu.
- **v2 (posle sezone):** real-time alarm.

ANPR arhitektura dobija svoj ADR tokom spike-a.

### 5. Walk-in i booking su podjednako važni

Oko 50% pranja su walk-in. Terminal (brz unos na licu mesta) i online
booking flow imaju isti prioritet.

### 6. Mobilna aplikacija je odložena

Do kraja sezone ide responsive web + PWA (terminal i booking). Expo se
vraća tek kad postoji konkretan razlog: push notifikacije, kamera ili
prisustvo u store-u.

### 7. Hosting

Hetzner VPS + Docker Compose. Detalji (domen, HTTPS, tajne, backup,
produkcione migracije) idu u poseban ADR uz prvi produkcioni deploy.

### 8. Sanacija uz feature rad

P3 (formatiranje datuma), P4 (ADR dug) i P5 (zauzetost boksa) ne rade se
kao posebne faze. Rade se uz feature koji dira iste fajlove ili isti
domen.

### 9. Milestone-i

| Milestone | Period | Sadržaj |
|---|---|---|
| **M1 — Temelj** | oktobar–novembar 2026 | P2 (završen), ovaj ADR, T1 (test projekat: xUnit + Testcontainers/Postgres), minimalan produkcioni deploy |
| **M2 — Perionica spremna za svakodnevni rad** | novembar 2026 – januar 2027 | kategorije vozila po tenantu, radno vreme po danima + neradni dani + blokada boksa (uz P5), snapshot cene na rezervaciji, naplata na terminalu i dnevni presek kase, brži walk-in, P3 |
| **M3 — Stvrdnjavanje produkcije** | januar–februar 2027 | backup i provera vraćanja, Resend sa verifikovanim domenom, produkcijska konfiguracija i tajne, monitoring i logovi, PWA manifest, NU1903; **prijatelj počinje svakodnevni rad** |
| **M4 — Flota pilot + ANPR v1** | februar–april 2027 | firma i vozila u sistemu, pranja vezana za firmu, mesečna specifikacija (PDF/Excel); ANPR v1 u produkciji |
| **Posle sezone** | od maja 2027 | real-time ANPR alarm, paketi pranja za flote, SEF (eFaktura) API, onboarding novih tenanta, naplata pretplate |

Ako M4 kasni, flota se pomera posle sezone (može početi sa ručnom
specifikacijom), a ANPR v1 ostaje u M4.

### Šta ovaj ADR ne odlučuje

Odluke na nivou funkcija dobijaju svoj ADR uz feature na koji se odnose:
kategorije vozila po tenantu, model radnog vremena, snapshot cene i
naplata, test strategija (T1), ANPR arhitektura, hosting i deploy. Ovde
se navode samo kao sadržaj milestone-a.

## Razlozi i razmotrene alternative

**Čist SaaS (više tenanta odmah).** Odbačeno. Jedan pravi korisnik u
svakodnevnom radu otkriva više problema nego više tenanta u demo
režimu. Onboarding vlasnika bez tehničkog iskustva traži proizvod koji
je već dokazan na jednoj perionici.

**Čist B2B (samo flote).** Odbačeno. Flota pere vozila u perionici, pa
bez perionice koja radi na sistemu nema ni evidencije pranja koju bi
firma dobila. B2B je ipak glavni izvor prihoda, pa se pilot sa jednom
flotom radi rano, u M4, da bi se model validirao.

**Provizija po rezervaciji umesto fiksne pretplate.** Odbačeno. Oko 50%
pranja su walk-in, pa bi provizija po online rezervaciji promašila
polovinu prometa ili bi tražila naplatu walk-in unosa, a to vlasnik ne
bi prihvatio. Fiksna pretplata po boksu je predvidljiva za vlasnika i
lako se objašnjava, a broj boksova prati kapacitet perionice.

**Real-time ANPR alarm u v1.** Odloženo za v2. Prvo treba izmeriti
tačnost prepoznavanja na stvarnim kamerama, uglovima i osvetljenju.
Lažni alarmi bi uništili poverenje i radnika i vlasnika u sistem, a
dnevni izveštaj daje istu informaciju bez tog rizika.

**Mobilna aplikacija (Expo) uz web.** Odloženo. Jedan codebase je
jedino što jedan developer može da održava do sezone, a ništa u M1–M4
ne traži native mogućnosti.

**Kubernetes ili managed PaaS.** Odbačeno za sada. Hetzner VPS sa Docker
Compose-om ima najmanji trošak, a isti Compose već radi lokalno.
Kubernetes je preteran za jedan tenant.

## Posledice

### Pozitivne

- Rad do sezone ima jedan merljiv cilj: perionica radi svaki dan na
  produkciji.
- Produkcija postoji rano (M1/M3), pa se problemi sa deploy-om,
  isporukom emaila i backup-om otkrivaju pre nego što prijatelj počne.
- Fiksni redosled milestone-a smanjuje prebacivanje između tokova.

### Negativne / kompromisi

- Odlaže se: B2B portal za samostalno korišćenje, SMS/Viber (Infobip),
  online plaćanja (AllSecure/Monri), SEF API, onboarding novih tenanta,
  naplata pretplate i mobilna aplikacija. Faze 2–4 iz `docs/ROADMAP.md`
  ne važe kao plan do proleća 2027.
- Proizvod se oblikuje prema jednoj perionici. Rizik je da se njene
  navike ugrade kao pravila za sve tenante. Mitigacija: podešavanja koja
  se razlikuju među perionicama (kategorije vozila, radno vreme) su po
  tenantu od početka.
- M4 je preopterećen za jednog developera (vidi rezervni plan iznad).

### Obaveze koje iz ove odluke proističu

- ADR-025 je produkcioni migracioni flow odložio do "Faze 3". Po ovom
  ADR-u on mora biti rešen uz minimalan produkcioni deploy (kraj M1 ili
  početak M2), najkasnije u M3.
- Svaka odluka iz sekcije "Šta ovaj ADR ne odlučuje" dobija svoj ADR
  pre ili tokom implementacije.
- `docs/PROJECT_STATE.md` prati trenutni milestone i sledeći korak.

## Otvorena pitanja

- **Fakturisanje flote.** Treba sa knjigovođom perionice potvrditi da li
  je perionica u PDV sistemu i kako izdaje B2B fakture (SEF). Odgovor
  određuje da li je mesečna specifikacija dovoljna za pilot. Rok: pre M4.
- **Ko plaća ANPR hardver i PlateRecognizer API.** Perionica, WashBook
  ili je trošak uračunat u ANPR doplatu? Utiče na cenu paketa. Rok: pre
  ANPR v1.
- **Cenovnik pretplate.** Iznos po broju boksova i ANPR doplata nisu
  definisani. Ne blokira razvoj do M3.

## Reference

- `docs/PROJECT_STATE.md` — sekcije "Pravac proizvoda" i "Milestone-i do sezone"
- Commit `41a1d79` — prvo beleženje pravca i milestone-a u `PROJECT_STATE.md`
- ADR-002 — tehnološki stek (Expo ostaje u steku, samo je rad odložen)
- ADR-025 — migracije i dev seed (produkcioni migracioni flow)

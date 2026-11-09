# ADR-028 — Strategija dvostrane platforme: alat prvo, mreža posle

**Status:** Zamenjeno ADR-029
**Datum:** 2026-10-08
**Autor:** Petar Bogdanović

> **Zamenjeno 2026-11-09.** Ova odluka više ne važi. Važeći pravac je u
> ADR-029 i `docs/plan/WashBook-Plan-razvoja.md`. Tekst ispod je istorija.

## Kontekst

WashBook ima dve strane. Vlasnik perionice plaća pretplatu za alat
(ADR-026), a vozač bi trebalo da preko platforme nađe perionicu, rezerviše
pranje i pročita recenzije. Dugoročna zamisao je platforma na kojoj vozač
nalazi najbližu perionicu, a perionica dobija kupce.

To je problem "kokoške i jajeta". Stranica za pretragu nema vrednost za
vozača dok u njegovom gradu nema dovoljno perionica, a perionica ne vidi
razlog da plati ako joj platforma ne dovodi kupce. Sa jednom ili dve
perionice WashBook ne može da obeća nove kupce, a obećanje koje se ne
ispuni ruši poverenje prvih korisnika.

Pitanje se otvorilo uz redizajn landing stranice (2026-10-08): kome je
stranica namenjena i kako se ona povezuje sa stranicom koju koriste vozači.

## Odluka

### 1. Vlasniku se prodaje alat, ne kupci

Ponuda vlasniku perionice počiva na vrednosti koju alat ima i bez ijednog
novog kupca: evidencija svakog pranja (online i walk-in), terminal za
radnike, pregled za vlasnika, ANPR zaštita od krađe (ADR-026, M4) i stranica
za rezervacije za kupce koje perionica već ima. Do faze mreže (tačka 3)
WashBook ne obećava nove kupce.

### 2. Vozači dolaze preko perionice

Do faze mreže vozač ne dolazi preko WashBook-a, nego preko perionice. Ulaz
je stranica perionice `/book/<slug>`, koju perionica deli sama: Instagram,
dugme za zakazivanje na Google Business profilu, QR kod na perionici. Svaka
rezervacija ostavlja vozača u sistemu, pa baza vozača raste kroz perionice.

### 3. Pretraga za vozače kad grad ima dovoljno perionica

Stranica za vozače (pretraga, mapa, lista perionica) otvara se tek kad u
jednom gradu postoji oko 8–10 perionica na platformi. Do tada se ne
prikazuje kao glavni proizvod.

| Faza | `/` (glavna stranica) | Vozač dolazi preko |
|---|---|---|
| Sada (1–2 perionice) | Ponuda za vlasnike perionica | `/book/<slug>`, link perionice |
| Rast (3–7 u gradu) | Ponuda za vlasnike perionica | `/book/<slug>`; baza vozača raste, ne prikazuje se javno |
| Mreža (8–10+ u gradu) | Stranica za vozače; ponuda za vlasnike prelazi na `/za-perionice` | Pretraga, mapa, `/book/<slug>` |

### 4. Recenzije samo od proverenih pranja

Recenziju perionice može da ostavi samo vozač čije je pranje evidentirano
kroz rezervaciju ili terminal. Otvorene recenzije (kao na Google-u) se ne
uvode. Recenzije dolaze uz pretragu (tačka 3) i dobijaju svoj ADR.

### 5. Početak u manjem gradu

Prve perionice se traže u jednom manjem gradu (red veličine Novi Sad, Niš,
Kragujevac), ne u Beogradu. U manjem gradu se prag iz tačke 3 dostiže sa
manje perionica, pa pretraga ranije dobija smisao.

### Šta ovaj ADR ne menja

- Milestone-i M1–M4 iz ADR-026 ostaju isti. Pretraga, mapa i recenzije
  su posle sezone 2027.
- Vizuelni pravac ostaje ADR-023 ("Confident Utility"). Redizajn landing
  stranice menja strukturu i sadržaj, ne boje i fontove.

## Razlozi i razmotrene alternative

**Alat i obećanje novih kupaca odmah.** Odbačeno. Zvuči jače, ali sa jednom
ili dve perionice obećanje ne može da se ispuni. Prvi vlasnici su i prve
preporuke, a neispunjeno obećanje bi ih izgubilo.

**Prvo vozači, pa perionice.** Odbačeno. Traži marketing ka vozačima i
budžet, a vozači bez perionica nemaju šta da rezervišu. Za jednog
developera bez budžeta za marketing to nije izvodljivo.

**Pretraga odmah, i sa jednom perionicom.** Odbačeno. Prazna pretraga šalje
signal da platforma ne uspeva, i vozačima i vlasnicima kojima se
WashBook prodaje.

**Čist SaaS, bez marketplace-a.** Odbačeno kao dugoročni pravac. Mreža
vozača je ono što WashBook kasnije razlikuje od običnog softvera za
zakazivanje i daje vlasniku razlog da ostane. Ovaj ADR je samo odlaže do
trenutka kad ima smisla.

**Otvorene recenzije.** Odbačeno. Lakše se skupljaju, ali traže moderaciju
i trpe lažne ocene. Recenzije vezane za evidentirano pranje su prednost
koju konkurencija bez terminala i evidencije nema.

**Beograd kao prvi grad.** Odbačeno za početak. Najveće tržište, ali za
gustinu perionica koja opravdava pretragu treba višestruko više tenanta.

## Posledice

### Pozitivne

- Obećanje vlasniku je istinito i proverljivo od prvog dana.
- Svaka nova perionica donosi i svoje vozače, pa se baza vozača gradi
  bez posebnog marketinga.
- Pretraga i recenzije kreću sa sadržajem, a ne prazne.

### Negativne / kompromisi

- Do faze mreže WashBook je za vlasnika "samo" softver i mora da opravda
  cenu alatom. Najjači argument, ANPR, stiže tek u M4.
- Rast zavisi od toga da li perionice zaista dele svoj link. Ako ga ne
  dele, baza vozača ne raste.
- Prelazak `/` sa vlasnika na vozače kasnije menja rute i landing
  stranicu.

### Obaveze koje iz ove odluke proističu

- Landing stranica (`/`) je usmerena na vlasnike perionica. Vozači dobijaju
  samo diskretan link "Rezerviši pranje" ka listi perionica.
- Stranica perionice `/book/<slug>` postaje glavni ulaz za vozače i mora da
  prikaže identitet perionice (ime, adresa, radno vreme). Plan za tu stranicu
  se pravi posle redizajna landing stranice.
- Dashboard vlasnika dobija, kasnije, alat za deljenje stranice perionice
  (link, QR kod za štampu, uputstvo za Google Business profil).
- Pretraga, mapa i recenzije dobijaju svoj ADR pre implementacije.

## Otvorena pitanja

- **Prag za pretragu.** "Oko 8–10 perionica u gradu" je procena. Tačan prag
  i da li se meri brojem perionica ili brojem vozača u bazi odlučuje se
  pre otvaranja pretrage.
- **Koji grad.** Konkretan grad nije izabran. Zavisi od toga gde je
  prijateljeva perionica i gde postoje prvi kontakti.
- **Saglasnost vozača.** Da li vozač koji je rezervisao kod jedne perionice
  može kasnije da dobija ponude drugih perionica. Treba proveriti sa
  aspekta zaštite podataka (ZZPL) pre nego što se baza vozača koristi
  šire od jedne perionice.

## Reference

- ADR-023 — vizuelni pravac "Confident Utility"
- ADR-026 — pravac proizvoda do sezone 2027 (model pretplate, milestone-i)
- Booksy, Fresha — primeri platformi koje su krenule od alata za biznis, a
  mrežu korisnika gradile kasnije

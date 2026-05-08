# ADR-023 — Vizuelni identitet javnih stranica: "Confident Utility"

**Datum:** 2026-05-07
**Status:** Prihvaćeno
**Faza:** 1.7

---

## Kontekst

Pri implementaciji landing stranice (Faza 1.7) doneta je odluka o vizuelnom
pravcu za sve javno dostupne stranice platforme. Pre donošenja odluke
razmatrana su tri moguća pravca:

1. **Playful illustrations** — pastelne boje, ilustracije automobila i sapunica,
   zaobljeni oblici, font sa karakterom (Nunito, Poppins)
2. **Corporate SaaS** — plava na beloj, tabele, gusti prose tekst, konvencije
   enterprise softver
3. **Confident Utility** — strogi neutralni pozadinski ton, jedan akcent boja,
   monospace labele, precizna tipografija bez dekoracije

Odluka nije doneta na osnovu estetske preference nego na osnovu toga
koji pravac komunicira pravu vrednost platforme pravoj publici.

---

## Odluka

WashBookPro javne stranice (landing, profil, buduće marketing i settings
stranice) koriste vizuelni pravac **"Confident Utility"**.

### Zašto "Confident Utility", a ne alternativa

**Playful** pravac odbijen jer pogrešno pozicionira platformu. Mušterija
koja rezerviše pranje automobila ne želi "zabavno" — želi brzo i sigurno.
Ilustracije signalizuju startup koji pokušava da bude simpatičan. WashBookPro
ne nudi emociju — nudi operativnu efikasnost. Ton mora da to komunicira.

**Corporate SaaS** pravac odbijen jer je prenaglašen za B2C kontekst.
Tabele, gusti tekst i plava-na-beloj paleta su standardni signal za
enterprise software. WashBookPro javne stranice ciljaju privatne korisnike
koji reservišu jednom u 2-3 nedelje, ne IT procurement timove.

**Confident Utility** je jedini pravac koji odgovara strukturnoj poziciji
platforme: korisna alatka, bez frkcije, bez performativne radosti.
Estetika je posledica te pozicije, ne polazna tačka.

### Referentni brendovi — strukturni argument

Tri referentna brenda za Confident Utility pravac:

- **Linear** — project management alat koji odbija enterprise kompromis.
  Neutralna pozadina, jedan akcent, precizne animacije tranzicija. Signal:
  "ovaj alat radi tačno to što piše". WashBookPro booking flow treba isti
  signal — bez praznih stanja, bez preteranog onboardinga, bez ilustracija
  koje objašnjavaju šta je kalendar.

- **Cal.com** — scheduling platforma za B2C i B2B. Monospace labele uz
  forme ("korak 1 / 3", "30 min", "slobodan"), beli kartice na sivkastoj
  pozadini, font bez serifa za sve UI elemente. Cal.com vizuelno komunicira
  da je rezervisanje termina operacija, ne iskustvo. Isti ton je tačan
  za WashBookPro booking flow.

- **Ramp** — fintech za expense management. Strogi neutralni ton, precizna
  numerička tipografija, nema dekorativnih elemenata. Ramp koristi vizuelni
  jezik koji govori "mi smo ozbiljni oko vaših podataka". WashBookPro
  rukuje ličnim podacima korisnika (telefon, vozilo) i terminski zakazanim
  obavezama — isti registar poverenja je opravdan.

Zajednički strukturni razlog: sva tri brenda imaju publiku koja alat
koristi iz potrebe, ne iz izbora. Ta publika nagrađuje efikasnost i
kažnjava neiskrenost u komunikaciji.

### Paleta boja

Šest dizajn tokena definisano u `web/app/globals.css` (`/* WashBook tokens */`):

| Token | Vrednost | Upotreba |
|---|---|---|
| `--wb-bg` | `#FAFAF7` | Pozadina stranice (topla bela, ne čista) |
| `--wb-fg` | `#0A0E27` | Primarni tekst (tamno plavo-crna) |
| `--wb-accent` | `#2563EB` | Jedina akcent boja — CTA, linkovi, selekcije |
| `--wb-border` | `#E8E6E0` | Linije razdvajanja, obrubi kartica |
| `--wb-muted` | `rgba(10, 14, 39, 0.6)` | Sekundarni tekst, placeholder, meta-podaci |
| `--wb-border-dark` | `rgba(255, 255, 255, 0.12)` | Obrubi na tamnoj pozadini |

`--wb-accent` (`#2563EB`) je jedina boja koja nosi vizuelnu težinu.
Sekundarne akcent boje (zelena za uspeh, crvena za grešku) dopuštene su
isključivo u kontekstu feedback stanja (toast, validacija), nikada kao
dekoracija.

### Tipografija

| Uloga | Font | Varijabla | Izvor |
|---|---|---|---|
| Body / UI tekst | Figtree | `--font-sans` | `next/font/google` |
| Monospace labele | GeistMono | `GeistMono.variable` | `geist/font/mono` |
| Alternativni sans | GeistSans | `GeistSans.variable` | `geist/font/sans` |

**Monospace eyebrow pattern** — kratke labele iznad sekcija, koraci
u booking flowu, i meta-podaci (trajanje, cena po tipu) pišu se
`font-mono text-xs uppercase tracking-widest`. Primer iz implementacije:
```
KORAK 1 / 3     ← monospace eyebrow
Kompletno pranje ← Figtree semibold, body size
60 min · 1.500 RSD ← muted, monospace
```

Ovaj pattern Signal: platforma tretira informaciju kao podatak, ne kao
marketing kopiju. Isto ponašanje u Linear task viewu i Cal.com timeslot
gridu.

### Stroga pravila

1. **Gradijenti umereno.** Gradijenti se koriste umereno i samo kao suptilna
   ambient pozadina (transparentnost ≥40%, bez upadljivih boja). Cilj: topao
   kontekst, ne vizuelni efekat. Gradijenti na funkcionalnim elementima —
   dugmadima, karticama, header-ima — su izbegavani jer signaliziraju
   generičnu SaaS estetiku.

2. **Jedan akcent.** `--wb-accent: #2563EB` je jedini vizuelni akcent na
   stranici. Drugi jarki tonovi (narandžasta, zelena, ljubičasta) su
   zabrana van feedback/status konteksta. Svako uvođenje druge boje mora
   biti dokumentovano ovde.

3. **Monospace eyebrow za labele.** Svaka kratka gornja labela (section
   badge, korak indikator, meta tag) koristi `font-mono uppercase
   tracking-widest text-xs`. Nikad Figtree za ovu ulogu.

4. **Whitespace kao element.** Spacing između sekcija je dizajn odluka,
   ne default vrednost. Gusto slaganje elemenata čita se kao signal previše
   informacija; svaka nova sekcija mora imati jasno vizuelno disanje.

---

## Gde se pravac primenjuje

- `web/app/page.tsx` — landing stranica (Hero, HowItWorks, WashList, Footer)
- `web/app/profil/` — korisnički profil (tri forme: lični podaci, email, lozinka)
- Buduće marketing stranice — `/pricing`, `/o-nama`, blog (ako bude dodat)
- Buduće settings/konfiguracija stranice za krajnje korisnike

---

## Gde se pravac NE primenjuje

**Owner dashboard (`web/app/(dashboard)/`)** ima drugačiju publiku i
drugačiji cilj. Vlasnik perionice koristi dashboard svakodnevno za
operativni rad — njemu treba informaciona gustina, ne marketing ton.
Dashboard može koristiti iste design tokene (boje i fontovi su zajednički)
ali ne mora da prati Confident Utility pravac za layout, spacing ili
eyebrow pattern konvencije.

Dizajnerske odluke specifične za dashboard dokumentovati u zasebnom ADR
kada postoji dovoljna osnova za dokumentovanje (minimalno dve distinktivne
odluke koje se razlikuju od ovog pravca).

---

## Posledice

**Pozitivne:**
- Vizuelna konzistentnost između javnih stranica je ostvariva grepping-om
  na forbidden patterns (gradijenti na funkcionalnim elementima, višestruke akcent boje)
- Referentni brendovi daju konkretan odgovor na pitanje "da li ovo izgleda
  kao WashBookPro?" bez potrebe za brand guidelineom
- Monospace eyebrow pattern je lako reproducibilan bez dizajnerske odluke
  za svaku novu stranicu

**Negativne:**
- Confident Utility estetika može biti manje upečatljiva na paid ads
  kanalima koji nagrađuju vizuelni kontrast (Instagram, TikTok). Ovo nije
  izmereno za našu publiku i ostaje hipoteza dok ne pokrenemo prvu paid
  kampanju i izmerimo CTR kroz A/B test.
- Strogo no-gradient pravilo može biti u konfliktu sa trećim komponentama
  (npr. animacije iz biblioteka). Svaki izuzetak mora biti eksplicitan.

---

## Alternativa

**Playful illustrations** razmatran i odbijen — videti "Kontekst" sekciju.

**Odvojeni vizuelni sistem za svaku stranicu** razmatran i odbijen.
Nekonzistentnost između landing-a i profil stranice stvara utisak
nedovršenosti. Korisnik koji sa landing-a dođe na profil mora imati
isti vizuelni kontekst.

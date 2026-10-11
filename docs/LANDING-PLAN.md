# LANDING-PLAN.md — redizajn landing stranice za vlasnike perionica

**Napravljeno:** 2026-10-08 (HEAD `51dcae5`). **Status:** odobren pravac, implementacija nije započeta.
Privremeni fajl: kad se redizajn završi, obriši ga u istom commitu kao ažuriranje
`docs/PROJECT_STATE.md` (Gate 4).

Plan je pisan za agenta koji ga izvršava korak po korak. Sve što ovde nije
navedeno — **ne radiš**. Kad nešto ne ide po planu, **staneš i prijaviš**,
ne improvizuješ. Ne "poboljšavaj" tekst, boje ni raspored van onoga što piše.

---

## Cilj

Stranica `/` postaje landing za **vlasnike perionica** (ADR-028), po pravcu
"B2 — Jedan dan, življe" sa dizajn canvasa
(https://claude.ai/artifact/7YEqVBg1esFFDW6J2JPLzD, artboard `Dan2`).
Ovaj plan sadrži sve što ti treba iz dizajna: ne moraš da otvaraš canvas.

Ideja stranice: jedan dan u perionici. Hero ima interaktivnu vremensku liniju
boksova koju korisnik "premotava" dugmadima 07:45 / 11:20 / 15:00 / 19:30.
Ispod je traka sa događajima koja klizi, pa četiri sekcije koje prate dan,
pri čemu boja pozadine prati doba dana (jutro svetlo → podne plavo →
popodne svetlo → veče tamno plavo).

Vozači dobijaju samo link "Rezerviši pranje" ka novoj stranici `/perionice`
(lista perionica, premeštena sa današnjeg landinga).

## Odluke koje je Petar već doneo (ne menjati)

- **Publika:** vlasnici perionica. Bez obećanja novih kupaca (ADR-028).
- **Vizuelni pravac:** ADR-023 ostaje. Pozadina `#FAFAF7`, navy `#0A0E27`,
  jedini akcenat `#2563EB`, Figtree + Geist Mono. Nema gradijenata na
  funkcionalnim elementima (dugmad, kartice, polja).
- **Izbacuje se:** izmišljena statistika i brojači, lažni prozor browsera,
  "01/02/03 kako radi", tri cenovna paketa, FAQ, prijava za mobilnu aplikaciju.
- **ANPR (kamera)** se uvek prikazuje kao "uskoro". **Flote** kao "pilot faza".
- **Brojevi u heroju su primer** i to mora da piše na stranici ("Primer dana").
- **Nema kontakt forme** (nema backend-a za nju). Kontakt je `mailto:` i
  opciono `tel:` link (vidi Gate 0).
- **Nema konkretnih cena.** Samo "Jedna mesečna cena, prema broju boksova."

---

## Pravila izvršavanja (obavezno)

Pre početka pročitaj `CLAUDE.md` i `docs/PROJECT_STATE.md`.

- **Gate po gate.** Posle svakog gate-a STANI. U odgovoru pokaži, kao tekst:
  pun sadržaj svakog novog ili izmenjenog fajla i doslovan izlaz svake
  provere iz gate-a. Čekaj Petrovo odobrenje.
- **Commit** tek posle odobrenja, jedan po gate-u, tačno poruka iz gate-a.
  Jednolinijski `git commit -m "..."`, **bez AI atribucije** (bez
  "Co-Authored-By", bez "Generated with"). **Nema push-a.**
- **Ne menjaj ništa van fajlova navedenih u gate-u.** Ako misliš da još nešto
  mora da se promeni, stani i pitaj.
- **Kad provera padne:** ne gasi proveru, ne dodaj `eslint-disable`,
  `@ts-ignore` ni `any` da bi prošlo. Stani i prijavi: šta, očekivano,
  dobijeno, zašto misliš da je tako.
- **Ne diraj:** `web/app/book/**`, `web/app/terminal/**`,
  `web/app/(dashboard)/**`, `web/lib/auth.ts`, `web/lib/customer-auth.ts`,
  backend. Ništa od toga nije deo ovog plana.
- Razgovor sa Petrom na srpskom (latinica). Kod, identifikatori i komentari
  na engleskom. Tekst na stranici na srpskom (latinica), tačno kako piše u
  planu.

---

## Okruženje i zamke (pročitaj pre koda)

- Web je Next.js 16, React 19, Tailwind v4, TypeScript. Package manager
  **pnpm** (zaključan na 10.33.2), nikad npm. Komande iz `web/`.
- Web u Dockeru je **produkcioni build** (`web/Dockerfile`), nema hot reload.
  Da vidiš izmene na `http://localhost:3000`: iz `infra/` pokreni
  `docker compose up --build -d web`. Backend je na `:8080`.
- **Stilovi samo preko `--wb-*` tokena** (`bg-[var(--wb-accent)]`,
  `text-[var(--wb-fg)]` …). **Nikad** Tailwind skala boja (`bg-blue-50`,
  `hover:bg-blue-700`, `text-gray-500`). Za hover na akcent dugmetu koristi
  `hover:opacity-90`.
- Fontovi su već podešeni u `web/app/layout.tsx`: `font-sans` = Figtree,
  `font-mono` = Geist Mono. Ne dodaj nove fontove.
- `web/components/landing/Nav.tsx` koristi i **`/profil`** (`web/app/profil/page.tsx`).
  **Ne menjaj `Nav.tsx`.** Landing dobija novi header; `Nav.tsx` ostaje za
  stranice za vozače (`/profil`, nova `/perionice`).
- ADR-022: nijedan fajl ne sme da importuje i `auth.ts` i `customer-auth.ts`.
  Novi landing fajlovi ne importuju **nijedan** od njih.
- **Lint baseline:** `pnpm exec eslint components/landing app/page.tsx` danas
  daje 1 error i 1 warning, oba u `Nav.tsx` (`react-hooks/set-state-in-effect`).
  To je postojeće stanje i ne popravlja se u ovom planu. Novi fajlovi moraju
  biti bez ijedne greške i upozorenja.
- Postoji pokvaren link `/rezervacije` u `Nav.tsx` (ruta ne postoji). Nije
  deo ovog plana, ne popravljaj ga.
- `web/app/api/waitlist/route.ts` postoji samo zbog `Waitlist.tsx` i samo
  loguje email. Briše se u Gate 3.

---

## Dizajn sistem za ovu stranicu

### Tokeni (dodaju se u Gate 1, u postojeći `:root` blok "WashBook design tokens" u `web/app/globals.css`)

Postojeći tokeni ostaju. Dodaju se tačno ovi:

```css
  --wb-surface: #FFFFFF;
  --wb-placeholder: #EFEDE7;
  --wb-border-strong: rgba(10, 14, 39, 0.25);
  --wb-on-dark-muted: rgba(250, 250, 247, 0.7);
```

Mapa boja koje stranica koristi:

| Upotreba | Token |
|---|---|
| Pozadina stranice, svetle sekcije | `--wb-bg` |
| Tekst, tamne sekcije (navy) | `--wb-fg` |
| Akcenat, plava sekcija, "online" blokovi | `--wb-accent` |
| Tekst na akcentu | `--wb-on-accent` |
| Kartice, beli blokovi | `--wb-surface` |
| Sporedan tekst na svetlom | `--wb-muted` |
| Sporedan tekst na tamnom | `--wb-on-dark-muted` |
| Linije na svetlom | `--wb-border` |
| Linije na tamnom | `--wb-border-dark` |
| Okvir "zakazano" bloka | `--wb-border-strong` |
| Mesta za fotografije, linije mreže na timeline-u | `--wb-placeholder` |

### Animacije (Gate 1, u `web/app/globals.css`, posle tokena)

```css
@keyframes wb-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.wb-marquee {
  animation: wb-marquee 48s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .wb-marquee {
    animation: none;
  }
}
```

Ostale animacije preko Tailwind-a, uvek sa `motion-reduce:` varijantom:
- tačka "UŽIVO": `animate-pulse motion-reduce:animate-none`
- linija "sada": `transition-[left] duration-500 ease-out motion-reduce:transition-none`
- blokovi na timeline-u: `transition-colors duration-300 motion-reduce:transition-none`

### Tipografija i raspored

- Kontejner: `mx-auto max-w-[1240px] px-6`.
- H1: `font-extrabold tracking-[-0.04em] leading-[0.98] text-[clamp(42px,6vw,84px)]`.
- Veliki sat u heroju: `font-mono font-semibold tracking-[-0.05em] leading-none text-[clamp(56px,7vw,96px)]`, `tabular-nums`.
- Vremena u sekcijama priče: `font-mono font-semibold tracking-[-0.05em] leading-none text-[clamp(48px,6vw,80px)]`.
- H2 u sekcijama: `font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(28px,3vw,38px)]`
  (u plavoj sekciji 11:20: `font-extrabold text-[clamp(32px,4vw,52px)] leading-[1.02]`).
- Tekst pasusa: `text-[17px] leading-relaxed`, boja `--wb-muted` (na tamnom `--wb-on-dark-muted`).
- Tablice vozila (npr. `BG 211-FL`): `font-mono font-bold border-[1.5px] border-[var(--wb-fg)] rounded-[5px] px-2 py-0.5`.
- Sekcije priče: vertikalni padding `py-28`. Unutar sekcije: levo kolona sa
  vremenom (`basis-[260px]`), desno sadržaj; na telefonu se slažu jedna ispod druge
  (`flex flex-wrap gap-10`).
- Dugmad i linkovi koji izgledaju kao dugmad: visina najmanje 44 px.

---

## Gate 0 — pre početka (bez koda)

1. Pročitaj fajlove: `web/app/page.tsx`, `web/app/layout.tsx`,
   `web/app/globals.css`, sve u `web/components/landing/`,
   `web/app/profil/page.tsx` (samo da vidiš kako koristi `Nav`).
2. Pokreni lint baseline i prikaži izlaz:
   `pnpm exec eslint components/landing app/page.tsx` (iz `web/`).
   Očekivano: 1 error, 1 warning, oba u `Nav.tsx`.
   Zabeleži i `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/profil`
   (poredi se u Gate 3).
3. **Pitaj Petra** i sačekaj odgovor:
   - email adresa koja se prikazuje na stranici za kontakt (ne izmišljaj je);
   - da li se prikazuje i broj telefona, i koji.
4. Ne menjaj nijedan fajl u ovom gate-u. Nema commit-a.

---

## Gate 1 — tokeni, podaci i interaktivni hero

Fajlovi:
- izmena `web/app/globals.css` (samo dodavanje iz "Dizajn sistem")
- nov `web/components/landing/day-sample.ts`
- nov `web/components/landing/contact.ts`
- nov `web/components/landing/LandingHeader.tsx`
- nov `web/components/landing/DayHero.tsx`
- izmena `web/app/page.tsx` (privremeno: `<LandingHeader />` i `<DayHero />`
  umesto `<Nav />` i `<Hero />`; ostale sekcije ostaju dok ih Gate 2 ne zameni)

### 1. `contact.ts`

```ts
export const CONTACT_EMAIL = "<email od Petra iz Gate 0>";
export const CONTACT_PHONE: string | null = <"broj od Petra" ili null>;
```

### 2. `day-sample.ts` — podaci i čista funkcija (bez React-a)

Vremenska osa je od 08:00 do 18:00, 10 kolona. `start` i `len` su u satima
od 08:00 (npr. `2.5` = 10:30).

```ts
export type BlockKind = "online" | "walk" | "cam";

export interface SampleBlock {
  start: number;
  len: number;
  kind: BlockKind;
  label: string;
}

export interface SampleBay {
  name: string;
  worker: string;
  blocks: SampleBlock[];
}

export interface Moment {
  time: string;
  hour: number;
  line: string;
}

export type BlockState = "done" | "running" | "scheduled" | "cam";

export interface ViewBlock {
  label: string;
  kind: BlockKind;
  state: BlockState;
  leftPct: number;
  widthPct: number;
}

export interface ViewBay {
  name: string;
  worker: string;
  blocks: ViewBlock[];
}

export interface DayStats {
  done: number;
  waiting: number;
  walkIn: number;
  cam: number;
}

export interface DayView {
  bays: ViewBay[];
  stats: DayStats;
  nowPct: number;
}
```

Podaci (tačno ovi):

```ts
export const MOMENTS: Moment[] = [
  { time: "07:45", hour: -0.25, line: "Kapija se otvara. Termini do podneva su već popunjeni online." },
  { time: "11:20", hour: 3.33, line: "Red do ulice. Walk-in se upisuje na terminalu, za par sekundi." },
  { time: "15:00", hour: 7, line: "Stiže firma sa kombijima. Pranja idu na njen mesečni spisak." },
  { time: "19:30", hour: 11.5, line: "Kraj dana. Sve je zapisano, i jedna tablica koju niko nije upisao." },
];

export const DEFAULT_MOMENT = 1;

export const SAMPLE_BAYS: SampleBay[] = [
  {
    name: "Boks 1",
    worker: "Marko",
    blocks: [
      { start: 0, len: 0.5, kind: "online", label: "BG 123-AB" },
      { start: 1.5, len: 0.75, kind: "online", label: "NS 482-KT" },
      { start: 2.5, len: 1, kind: "walk", label: "SU 093-RA" },
      { start: 5, len: 0.5, kind: "walk", label: "BG 902-ZE" },
      { start: 6, len: 1.5, kind: "online", label: "KG 210-DD" },
      { start: 8.25, len: 0.75, kind: "walk", label: "BG 330-AL" },
    ],
  },
  {
    name: "Boks 2",
    worker: "Nikola",
    blocks: [
      { start: 0.5, len: 1.5, kind: "online", label: "BG 117-LM" },
      { start: 2.5, len: 0.5, kind: "walk", label: "NI 455-TT" },
      { start: 3.3, len: 0.7, kind: "walk", label: "Kombi" },
      { start: 5.5, len: 2, kind: "online", label: "BG 051-NM" },
      { start: 8, len: 1, kind: "walk", label: "NS 019-PP" },
    ],
  },
  {
    name: "Boks 3",
    worker: "Jovan",
    blocks: [
      { start: 1, len: 1, kind: "walk", label: "Kombi" },
      { start: 3, len: 0.5, kind: "online", label: "BG 288-VV" },
      { start: 5.05, len: 0.5, kind: "cam", label: "BG 774-PO ?" },
      { start: 7, len: 1, kind: "walk", label: "BG 211-FL" },
      { start: 8.5, len: 1, kind: "online", label: "ČA 701-OB" },
    ],
  },
];
```

Funkcija `export function computeDayView(now: number): DayView` — pravila,
tačno ovim redom, za svaki blok svakog boksa:

1. `walk` blok se **ne prikazuje** ako je `start >= now` (walk-in se ne
   zakazuje, pojavi se tek kad auto stigne).
2. `cam` blok se ne prikazuje ako je `start >= now`. Inače `state = "cam"`,
   `stats.cam += 1`.
3. Ostali blokovi sa `start >= now` (to su samo `online`): `state = "scheduled"`,
   `stats.waiting += 1`.
4. Inače: ako je `start + len <= now` → `state = "done"`, `stats.done += 1`;
   u suprotnom `state = "running"`. Ako je `kind === "walk"` → `stats.walkIn += 1`
   (i za `done` i za `running`).
5. `leftPct = start * 10`, `widthPct = len * 10`.

`nowPct = Math.max(0, Math.min(100, now * 10))`.

Funkcija ne sme da menja `SAMPLE_BAYS` (vraća nove objekte).

**Kontrolne vrednosti** (proveri ih ručno u izveštaju, npr. privremenim
`node`/`tsx` pozivom ili logovanjem, pa ukloni log):
- `computeDayView(-0.25).stats` → `{ done: 0, waiting: 7, walkIn: 0, cam: 0 }`
- `computeDayView(3.33).stats` → `{ done: 5, waiting: 3, walkIn: 4, cam: 0 }`
- `computeDayView(7).stats` → `{ done: 9, waiting: 1, walkIn: 5, cam: 1 }`
- `computeDayView(11.5).stats` → `{ done: 15, waiting: 0, walkIn: 8, cam: 1 }`

Brojevi u tekstu stranice (traka u Gate 2, sekcija 19:30) su usklađeni sa
poslednjim redom: 15 pranja, 8 walk-in.

Ako dobiješ druge brojeve, **ne menjaj podatke da bi se poklopilo**: stani i
prijavi obe vrednosti i kako si računao.

### 3. `LandingHeader.tsx` (server komponenta, bez `"use client"`)

Stoji **unutar** tamne hero sekcije (nije `fixed`, nema blur/scroll efekta).
Raspored: `flex flex-wrap items-center justify-between gap-4 py-[22px]`, u kontejneru.

- Levo: `WashBook` (`font-extrabold text-xl tracking-[-0.02em]`), link na `/`.
- Desno (`flex flex-wrap items-center gap-[22px] text-[15px]`):
  - `Kako radi` → `#kako-radi` (boja `--wb-bg`)
  - `Cena` → `#cena` (boja `--wb-bg`)
  - `Rezerviši pranje` → `/perionice` (boja `--wb-on-dark-muted`)
  - `Prijava` → `/login` (boja `--wb-on-dark-muted`)
  - `Javite se` → `#kontakt`, kao dugme: `bg-[var(--wb-accent)] text-[var(--wb-on-accent)] px-[18px] py-[11px] rounded-lg font-semibold hover:opacity-90`
- Na širini ispod 640 px sakrij `Kako radi`, `Cena` i `Prijava` (`hidden sm:inline`);
  `Rezerviši pranje` i `Javite se` ostaju.
- Koristi `next/link` za `/`, `/perionice`, `/login`; običan `<a>` za `#…`.

### 4. `DayHero.tsx` (`"use client"`)

Spoljni `<section>`: `bg-[var(--wb-fg)] text-[var(--wb-bg)]`. Sadrži
`<LandingHeader />` na vrhu (prosleđen kao children ili renderovan unutra;
LandingHeader ostaje server komponenta: importuj ga u `page.tsx` i prosledi
kao `header` prop tipa `React.ReactNode`).

State: `const [moment, setMoment] = useState(DEFAULT_MOMENT)`.
`const view = useMemo(() => computeDayView(MOMENTS[moment].hour), [moment])`.

Raspored, odozgo nadole (sve u kontejneru):

**a) Naslov i sat** — `flex flex-wrap items-end gap-x-14 gap-y-8 pt-12`:
- `<h1>` (`basis-[560px] grow min-w-0`, stil H1): `Ceo dan vaše perionice na jednom ekranu.`
- Desno (`basis-[360px] min-w-0`): veliki sat `{MOMENTS[moment].time}` (boja `--wb-on-accent`),
  ispod `<p>` sa `{MOMENTS[moment].line}`: `mt-2.5 text-[17px] leading-normal
  text-[var(--wb-on-dark-muted)] min-h-[52px]`. Ovaj `<p>` ima `aria-live="polite"`.

**b) Dugmad za premotavanje** — `flex flex-wrap items-center gap-2.5 pt-9`:
- Labela: `PREMOTAJ DAN` (`font-mono text-xs tracking-[0.08em] text-[var(--wb-on-dark-muted)] mr-1.5`).
- Za svaki `MOMENTS[i]` jedan `<button type="button">` sa `aria-pressed={i === moment}`
  i `onClick={() => setMoment(i)}`, tekst `time`. Stil:
  `font-mono text-[15px] font-semibold min-h-11 px-4 rounded-full border-[1.5px]`;
  aktivan: `bg-[var(--wb-accent)] border-[var(--wb-accent)] text-[var(--wb-on-accent)]`;
  neaktivan: `bg-transparent border-[var(--wb-border-dark)] text-[var(--wb-bg)] hover:border-[var(--wb-on-dark-muted)]`.

**c) Kartica sa timeline-om** — `mt-6 rounded-t-[18px] bg-[var(--wb-bg)] text-[var(--wb-fg)] px-6 pt-6 pb-5 overflow-x-auto`.
Kartica se "naslanja" na donju ivicu sekcije (nema donjeg paddinga sekcije ispod nje).
Unutra `min-w-[860px]`:
- Zaglavlje reda: `Subota` (`w-[88px] shrink-0 font-bold`) i grid od 10 kolona
  sa satima `08 09 10 11 12 13 14 15 16 17` (`font-mono text-xs text-[var(--wb-muted)]`),
  donja linija `border-b border-[var(--wb-border)] pb-3`.
- Za svaki boks red `flex items-center gap-4 py-3.5 border-b border-[var(--wb-border)]`:
  - levo (`w-[88px] shrink-0`): `name` (`font-mono text-sm font-semibold`), ispod `worker`
    (`text-xs text-[var(--wb-muted)] mt-0.5`);
  - desno traka `relative h-[52px] grow` sa vertikalnim linijama na svakih 10%
    (10 apsolutno pozicioniranih `<span>` širine 1px, boja `--wb-placeholder`,
    `aria-hidden`; **ne** koristi gradijent);
  - blokovi: apsolutno pozicionirani, `top-1.5 h-10 rounded-md px-2 flex items-center
    font-mono text-xs overflow-hidden whitespace-nowrap`, `style={{ left: `calc(${b.leftPct}% + 2px)`, width: `calc(${b.widthPct}% - 4px)` }}`.
    Stil po stanju:
    - `done`/`running` + `online`: `bg-[var(--wb-accent)] text-[var(--wb-on-accent)]`
    - `done`/`running` + `walk`: `bg-[var(--wb-fg)] text-[var(--wb-bg)]`
    - `running` dodatno: `ring-[3px] ring-[var(--wb-accent)]/25`
    - `scheduled`: `bg-transparent border-[1.5px] border-[var(--wb-border-strong)] text-[var(--wb-muted)]`
    - `cam`: `bg-[var(--wb-surface)] text-[var(--wb-accent)] border-[1.5px] border-dashed border-[var(--wb-accent)]`
    - svi: `transition-colors duration-300 motion-reduce:transition-none`
  - linija "sada": apsolutno, `-top-3.5 -bottom-3.5 w-0.5 bg-[var(--wb-accent)]`,
    `style={{ left: `${view.nowPct}%` }}`, `transition-[left] duration-500 ease-out motion-reduce:transition-none`, `aria-hidden`.
- Red statistike `flex flex-wrap items-center gap-x-8 gap-y-3 pt-[18px] text-[15px]`:
  - tačka `w-2 h-2 rounded-full bg-[var(--wb-accent)] animate-pulse motion-reduce:animate-none`
    + `UŽIVO · PRIMER DANA` (`font-mono text-xs tracking-[0.06em]`)
  - `Oprano: {done}`, `Čeka: {waiting}`, `Walk-in do sada: {walkIn}`,
    `Kamera bez zapisa: {cam}` (ova poslednja u boji `--wb-accent`);
    brojevi u `<strong className="font-mono tabular-nums">`
  - legenda (`ml-auto flex gap-3.5 text-[13px] text-[var(--wb-muted)]`): kvadratić 12 px
    akcent + `Online`, kvadratić navy + `Walk-in`, kvadratić sa okvirom
    `--wb-border-strong` + `Zakazano`.

**Pristupačnost:** timeline kartica dobija `role="group"` i
`aria-label="Primer dana u perionici, tri boksa, od 8 do 18 časova"`.

### 5. `page.tsx`

Privremeno:

```tsx
<main>
  <DayHero header={<LandingHeader />} />
  <HowItWorks />
  … (ostale postojeće sekcije bez promene)
</main>
```

`Nav` i `Hero` se više ne importuju u `page.tsx` (fajlovi ostaju do Gate 3).
`getTenants` i `WashList` za sada ostaju.

### Provera (Gate 1)

Iz `web/`:
1. `pnpm exec tsc --noEmit` → bez grešaka.
2. `pnpm exec eslint components/landing app/page.tsx` → samo
   postojeći baseline (1 error, 1 warning u `Nav.tsx`), ništa novo.
3. Kontrolne vrednosti `computeDayView` (vidi gore).

Iz `infra/`:
4. `docker compose up --build -d web`, pa `curl -s http://localhost:3000/ | grep -c "Ceo dan vaše perionice"` → `1`.
5. Screenshot `http://localhost:3000/` na 1440 px širine, za svako od četiri
   vremena (klik na dugme). Ako nemaš pregledač, napiši to i zamoli Petra da
   pogleda.

**Commit posle odobrenja:** `feat(web): add interactive day timeline hero for owner landing`

---

## Gate 2 — ostatak stranice

Fajlovi:
- nov `web/components/landing/ActivityTicker.tsx`
- nov `web/components/landing/DayStory.tsx`
- nov `web/components/landing/PhotoStrip.tsx`
- nov `web/components/landing/OwnerCta.tsx`
- nov `web/components/landing/LandingFooter.tsx`
- izmena `web/app/page.tsx` (konačan sastav i metadata)

Sve su server komponente (bez `"use client"`).

### 1. `ActivityTicker.tsx`

Puna širina (van kontejnera), `bg-[var(--wb-accent)] text-[var(--wb-on-accent)]
overflow-hidden whitespace-nowrap py-3.5 font-mono text-[15px]`, ceo element
`aria-hidden="true"` (dekoracija; isti podaci postoje u tekstu stranice).
Unutra `<div className="wb-marquee inline-flex gap-12 pl-12">` sa listom
**dvaput zaredom** (zbog beskonačnog klizanja). Stavka:
`<span><span className="opacity-70">{t}</span>  {text}</span>`.

Stavke (tačno ovim redom):

| t | text |
|---|---|
| 22:14 | Marko rezervisao obično pranje za 08:00 |
| 08:02 | BG 123-AB ušao u Boks 1 |
| 08:41 | NS 482-KT · walk-in · 1.100 RSD |
| 09:15 | Ana rezervisala dubinsko za subotu |
| 10:37 | Kombi upisan na terminalu za 9 s |
| 11:20 | Red: 3 auta · Boks 2 slobodan za 15 min |
| 13:05 | Kamera: BG 774-PO bez zapisa |
| 15:00 | Firma: 3 kombija na mesečni spisak |
| 19:30 | Dan zatvoren · 15 pranja |

### 2. `DayStory.tsx` — četiri sekcije

Prva sekcija ima `id="kako-radi"`. Svaka sekcija: levo vreme + podnaslov
ispod njega (`text-[15px] mt-2`), desno H2 + pasus + vizuelni element.

**07:45** — pozadina `--wb-bg`.
- Podnaslov: `Kapija se otvara`
- H2: `Kafa još nije gotova, a prvih šest termina je već zauzeto.`
- Pasus: `Kupci su rezervisali sinoć, sa kauča, na stranici vaše perionice. Svaki termin je vezan za boks, pa nema dva auta u istom.`
- Vizuel: bela kartica (`--wb-surface`, okvir `--wb-border`, `rounded-[14px]`,
  `rotate-[-1.2deg]`, senka `shadow-[0_18px_40px_-24px_rgba(10,14,39,0.35)]`).
  Zaglavlje kartice `STIGLO PREKO NOĆI · 6` (`font-mono text-xs text-[var(--wb-muted)]`),
  pa tri reda (vreme u mono + opis):
  `22:14` `Marko · obično, 08:00` / `23:51` `Ana · dubinsko, 08:30` / `06:58` `Stefan · SUV, 09:30`.

**11:20** — pozadina `--wb-accent`, tekst `--wb-on-accent`, pasus `opacity-85`.
- Podnaslov: `Red do ulice`
- H2 (veći, vidi Tipografija): `Kombi sa ulice. Deset sekundi i upisan je.`
- Pasus: `Nikola na terminalu izabere uslugu i boks. Pola kupaca dolazi bez najave, i od danas se svaki od njih broji.`
- Vizuel: tamna kartica terminala (`bg-[var(--wb-fg)] text-[var(--wb-bg)] rounded-[28px] p-[22px] rotate-[1.5deg]`,
  `basis-[300px]`), redom:
  `TERMINAL · NIKOLA` levo i `11:20` desno (mono, xs, `--wb-on-dark-muted`);
  `Walk-in` (bold, 19 px);
  polje sa okvirom `--wb-border-dark`: `Kombi — obično pranje · 1.400 RSD`;
  tri dugmeta-boksa u gridu (`Boks 1` prigušen, `Boks 2` akcent, `Boks 3`);
  dugme `Upiši` (`bg-[var(--wb-bg)] text-[var(--wb-fg)] font-bold min-h-[52px] rounded-xl`).
  Ovo je ilustracija: elemente renderuj kao `<div>`/`<span>`, **ne** kao
  `<button>`, i celoj kartici daj `aria-hidden="true"`.

**15:00** — pozadina `--wb-bg`.
- Podnaslov: `Stiže firma`
- H2: `Tri kombija iste firme. Niko ništa ne zapisuje u svesku.`
- Pasus: `Pranja se vezuju za firmu i tablicu. Prvog u mesecu firma dobija specifikaciju po vozilu, a vi spisak spreman za fakturu. Flote su u pilot fazi.`
- Vizuel: tri bele kartice jedna ispod druge, svaka sledeća pomerena udesno
  (`ml-0`, `ml-5`, `ml-10`): tablica + opis + broj pranja u mesecu (mono, 13 px, muted):
  `BG 211-FL` `Kombi · obično` `7. u mesecu` /
  `BG 212-FL` `Kombi · obično` `5. u mesecu` /
  `BG 215-FL` `Kombi · dubinsko` `2. u mesecu`.

**19:30** — pozadina `--wb-fg`, tekst `--wb-bg`, pasus `--wb-on-dark-muted`.
- Podnaslov: `Kapija se zatvara`
- H2: `Vi ste kod kuće. Dan je zatvoren, i znate tačno šta se desilo.`
- Pasus: `Sa telefona vidite svako pranje. Uskoro i izveštaj kamere: tablice koje su ušle u boks, a niko ih nije upisao.`
- Vizuel (kolona, `gap-3`):
  - dve kartice u gridu 2 kolone (okvir `--wb-border-dark`): `Pranja danas` / `15`
    i `Walk-in` / `8` (broj mono, 30 px);
  - kartica sa isprekidanim okvirom `border-[1.5px] border-dashed border-[var(--wb-on-dark-muted)]`:
    `KAMERA · USKORO` (mono xs), pa red: `13:05` (mono, muted) + tablica
    `BG 774-PO` (svetla: `bg-[var(--wb-bg)] text-[var(--wb-fg)]`) + `Boks 3 · niko nije upisao`;
  - `Primer dana. Kamera radi sa IP kamerama koje već imate.` (14 px, muted).

### 3. `PhotoStrip.tsx`

Kontejner, `pt-26 flex flex-wrap gap-6 items-start`. Tri `<figure>` kao polaroid:
`basis-[280px] grow min-w-0 bg-[var(--wb-surface)] p-3 pb-4 border border-[var(--wb-border)]`,
senka kao kartica iz 07:45, rotacije `-rotate-[1.5deg]`, `rotate-1 mt-10`, `-rotate-[0.5deg] mt-2`.
Unutra placeholder `h-[260px] bg-[var(--wb-placeholder)] flex items-center justify-center
font-mono text-[13px] text-[var(--wb-muted)]` sa `role="img"` i `aria-label`, pa
`<figcaption className="font-mono text-[13px] mt-3">`.

| Placeholder tekst (i `aria-label`) | figcaption |
|---|---|
| FOTO: kapija ujutru | 07:40 · otvaranje |
| FOTO: pena na kombiju | 11:24 · boks 2 |
| FOTO: radnik i tablet | 16:10 · terminal |

Placeholder-i se kasnije menjaju pravim fotografijama (Petar). Ne dodaj slike.

### 4. `OwnerCta.tsx`

`<section id="cena">`, kontejner, `py-28 flex flex-wrap gap-12 items-start`.

Levo (`basis-[460px] grow min-w-0`):
- `07:45?` (`font-mono font-semibold tracking-[-0.06em] leading-[0.9] text-[clamp(64px,9vw,128px)] text-[var(--wb-accent)]`)
- H2: `Sutra ujutru, vaša perionica.` (`mt-5 font-extrabold tracking-[-0.03em] leading-[1.05] text-[clamp(30px,3.6vw,46px)]`)
- Pasus: `Jedna mesečna cena, prema broju boksova. Rezervacije, terminal i pregled su uključeni. Kamera za tablice se dodaje kad je spremna.`

Desno (`id="kontakt"`, `basis-[420px] grow min-w-0 bg-[var(--wb-fg)] text-[var(--wb-bg)] rounded-[20px] p-8`):
- H3: `Dođemo i pokažemo vam uživo`
- Pasus: `Pišite nam ili pozovite, pa dogovorimo prikaz na vašoj perionici.`
- Link-dugme `mailto:${CONTACT_EMAIL}`: tekst `Pišite nam`, ispod sitno `CONTACT_EMAIL`;
  stil `bg-[var(--wb-accent)] text-[var(--wb-on-accent)] rounded-[10px] min-h-12 font-semibold hover:opacity-90`.
- Ako `CONTACT_PHONE !== null`: drugo link-dugme `tel:${CONTACT_PHONE}` (bez razmaka
  u `href`), tekst `Pozovite`, ispod broj; stil sa okvirom `--wb-border-dark`.

### 5. `LandingFooter.tsx`

`border-t border-[var(--wb-border)]`, kontejner, `py-7 flex flex-wrap justify-between gap-4 text-sm text-[var(--wb-muted)]`:
- levo `© 2026 WashBook · Srbija`
- desno: `Prijava za perionice` → `/login`, pa `Vozač ste? Rezervišite pranje →` → `/perionice`
  (`font-semibold text-[var(--wb-accent)]`).

### 6. `page.tsx` (konačno)

```tsx
import type { Metadata } from "next";
// importi novih komponenti

export const metadata: Metadata = {
  title: "WashBook — softver za autoperionice",
  description: "Rezervacije, walk-in i radnici na jednom ekranu. Softver za autoperionice u Srbiji.",
};

export default function HomePage() {
  return (
    <main>
      <DayHero header={<LandingHeader />} />
      <ActivityTicker />
      <DayStory />
      <PhotoStrip />
      <OwnerCta />
      <LandingFooter />
    </main>
  );
}
```

`getTenants`, `WashList` i stari importi se uklanjaju iz `page.tsx`
(stranica više nije `async`). Stari fajlovi komponenti ostaju na disku do Gate 3.

### Provera (Gate 2)

1. `pnpm exec tsc --noEmit` → bez grešaka.
2. `pnpm exec eslint components/landing app/page.tsx` → samo baseline.
3. `docker compose up --build -d web` (iz `infra/`), pa:
   `curl -s http://localhost:3000/ | grep -o "<title>[^<]*</title>"` →
   `<title>WashBook — softver za autoperionice</title>`.
4. `curl -s http://localhost:3000/ | grep -c -E "Najpopularnije|zadovoljnih|Budite prvi"` → `0`.
5. Screenshot cele stranice na 1440 px i na 390 px. Na 390 px: nema
   horizontalnog skrolovanja stranice (timeline sme da skroluje unutar svoje kartice).

**Commit posle odobrenja:** `feat(web): rebuild landing page for car wash owners`

---

## Gate 3 — `/perionice` i čišćenje

Fajlovi:
- nov `web/app/perionice/page.tsx`
- izmena `web/components/landing/WashList.tsx`
- brisanje: `web/components/landing/Hero.tsx`, `HowItWorks.tsx`, `Demo.tsx`,
  `Pricing.tsx`, `Faq.tsx`, `Waitlist.tsx`, `Footer.tsx`,
  `web/app/api/waitlist/route.ts` (i prazan folder `web/app/api/waitlist/`,
  pa `web/app/api/` ako ostane prazan)

### 1. `app/perionice/page.tsx` (server komponenta)

- `metadata`: title `Perionice — WashBook`, description `Izaberite perionicu i rezervišite termin online.`
- `getTenants()` prekopiraj **bez izmena** iz današnjeg `web/app/page.tsx`
  (pre Gate 2; uzmi ga iz `git show 51dcae5:web/app/page.tsx`).
- Render: `<Nav />` (postojeći, za vozače), `<main className="pt-16">` sa `<WashList tenants={tenants} />`,
  pa `<LandingFooter />`.

### 2. `WashList.tsx`

Samo ove izmene, ostalo ostaje:
- `id="perionice"` ostaje.
- Eyebrow `Perionice` ostaje; H2 `Rezerviši kod nas.` → `Izaberite perionicu.`;
  pasus → `Perionice koje primaju online rezervacije preko WashBook-a.`
  (ne tvrdimo "verifikovane" ni "u realnom vremenu").
- Ukloni emoji (`🚿`, `🚗`) i kutije oko njih.
- `bg-white` → `bg-[var(--wb-surface)]`; `bg-blue-50` se uklanja zajedno sa kutijom za emoji.
- Prazno stanje: tekst `Uskoro stižu perionice na platformu.` ostaje, bez ikone.

### 3. Provera da ništa ne importuje obrisane fajlove

`grep -rn -E "landing/(Hero|HowItWorks|Demo|Pricing|Faq|Waitlist|Footer)\b|api/waitlist" web/app web/components web/lib`
→ bez rezultata.

### Provera (Gate 3)

1. `pnpm exec tsc --noEmit` → bez grešaka.
2. `pnpm exec eslint components/landing app/page.tsx app/perionice` → samo baseline.
3. `pnpm build` (iz `web/`) → uspešan; prikaži poslednjih 30 redova (lista ruta,
   `/perionice` mora biti u njoj, `/api/waitlist` ne sme).
4. `docker compose up --build -d web`, pa:
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/perionice` → `200`
   - `curl -s http://localhost:3000/perionice | grep -c "Dev Wash"` → najmanje `1`
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/profil` → isto kao pre
     plana (stranica i dalje koristi `Nav`; zabeleži kod koji dobiješ i u Gate 0 i ovde)
5. Klik na `Vozač ste? Rezervišite pranje →` i na `Rezerviši pranje` u headeru vodi na
   `/perionice`; klik na `Dev Wash` vodi na `/book/dev-wash`.

**Commit posle odobrenja:** `feat(web): move wash list to /perionice and remove old landing sections`

---

## Gate 4 — završna provera i zatvaranje

Fajlovi: `docs/PROJECT_STATE.md`, brisanje `docs/LANDING-PLAN.md`.

### Provera

1. Tastatura: sa `Tab` se stiže do svih linkova i do četiri dugmeta vremena;
   `Enter`/`Space` menja vreme; fokus je vidljiv.
2. Smanjeno kretanje: u Chrome DevTools → Rendering → "Emulate CSS
   prefers-reduced-motion: reduce" → traka stoji, tačka ne pulsira, linija
   "sada" skače bez animacije.
3. Kontrast: tekst `--wb-muted` na `--wb-bg` i `--wb-on-dark-muted` na `--wb-fg`
   je čitljiv (oba su iznad 4.5:1; samo potvrdi da nigde nisi stavio svetliji ton).
4. Screenshot-ovi na 1440 i 390 px za `/` i `/perionice`.

Ako agent nema pregledač, navede šta nije mogao da proveri i zamoli Petra.

### `docs/PROJECT_STATE.md` — izmene, ne prepisivanje

- Zaglavlje: datum; redizajn landing stranice završen; sledeći korak čeka Petrov nalog.
- Nova sekcija `### Landing redizajn (ZAVRŠEN <datum>)` posle "T1 — test projekat":
  cilj (ADR-028, pravac B2), commit-i po gate-ovima, šta je izbačeno, nova ruta
  `/perionice`, placeholder-i za fotografije čekaju prave slike.
- U listi otvorenih stavki dodaj: pokvaren link `/rezervacije` u `Nav.tsx`;
  lint greška `react-hooks/set-state-in-effect` u `Nav.tsx`.

Obriši `docs/LANDING-PLAN.md`.

**Commit posle odobrenja:** `docs: close landing redesign`

---

## Van plana (ne radi)

- Stranica perionice `/book/<slug>` (zaglavlje perionice, greške "undefined" i
  Car/SUV/Van). Ima poseban plan posle ovog.
- Kontakt forma sa backend-om, Resend, upis u bazu.
- Prave fotografije, logo, favicon, Open Graph slika.
- Izmene `Nav.tsx`, dashboard-a, terminala, booking flow-a, backend-a.
- Produkcioni deploy (odložen na M3).

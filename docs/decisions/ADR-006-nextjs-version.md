# ADR-006: Next.js 16 umesto Next.js 15

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

ADR-002 je definisao Next.js 15 kao web frontend framework. Pri planiranju
Faze 0.6 (web scaffold), proverena je trenutna situacija sa verzijama:

- Next.js 15 je prešao u Maintenance LTS, EOL oktobar 2026 — za ~6 meseci
- Next.js 16 je Active LTS od oktobra 2025, trenutna stabilna verzija je 16.2.x
- U trenutku odluke, nijedan red Next.js koda još nije napisan u projektu

---

## Odluka

Scaffold `/web` foldera se radi sa Next.js 16 (Active LTS), a ne Next.js 15.
ADR-002 se ažurira da reflektuje ovu promenu.

---

## Razlozi

**EOL Next.js 15 za 6 meseci** — MVP razvoj traje kroz Fazu 1 i Fazu 2,
što znači da bismo morali da migriramo usred aktivnog razvoja. Nema smisla
počinjati sa framework-om koji ulazi u EOL pre nego što dođemo u produkciju.

**Nula migracionog troška** — nijedan red Next.js koda još nije napisan.
Prelazak se svodi na izmenu jednog broja u `pnpm create next-app@16`.

**Turbopack je default u Next.js 16** — dev server je 3–5x brži u odnosu
na Webpack koji je bio default u 15. Direktno poboljšanje developer experience-a
za solo developera.

**Build Adapters API stabilan u 16.2** — relevantan za self-hosted Hetzner
VPS deployment koji je planiran u Fazi 0.8. Lakša integracija sa hosting
provajderima koji imaju custom zahteve.

---

## Posledice

- Scaffold u Fazi 0.6 koristi `pnpm create next-app@16`
- React verzija je 19 (dolazi uz Next.js 16 automatski)
- shadcn/ui je kompatibilan sa Next.js 16 i React 19 od kraja 2024
- ADR-002 dobija napomenu: "Next.js verzija ažurirana u ADR-006"
- Ova odluka je u skladu sa strategijom opisanom u ADR-007

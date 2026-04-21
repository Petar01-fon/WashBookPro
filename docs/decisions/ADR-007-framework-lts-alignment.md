# ADR-007: Strategija verzija — uvek najnoviji Active LTS

**Datum:** 2026-04-21
**Status:** Prihvaćeno

---

## Kontekst

Tokom Faze 0, pri odabiru svake tehnologije pojavilo se isto pitanje: koja
verzija — stabilnija starija ili novija aktivno podržana? Node.js ima 22 LTS
i 24 LTS, .NET ima 9 i 10, Next.js ima 15 i 16. Bez jasnog pravila, svaki
odabir se razmatrao od nule i trošio vreme.

---

## Odluka

Uvek biramo najnoviji stabilni Active LTS release, nikad stariji Maintenance LTS
i nikad pre-release (canary, RC, beta).

Primenjena pravila u Fazi 0:

| Tehnologija | Odabrano | Odbijeno | Razlog odbijanja |
|-------------|----------|----------|-----------------|
| Node.js | 24 LTS | 22 LTS | 22 ulazi u Maintenance LTS april 2026 |
| .NET | 10 LTS | 9 (STS) | 9 nije LTS, EOL maj 2026 |
| Next.js | 16 LTS | 15 LTS | 15 EOL oktobar 2026, 16 je Active LTS |

---

## Razlozi

**Active LTS dobija features, bug fikseve i security patche** — Maintenance LTS
dobija samo kritične security patche. Za projekat u aktivnom razvoju tokom
12+ meseci, Maintenance LTS znači tehnički dug od prvog dana.

**Sprečava prinudne migracije usred razvoja** — ako počnemo sa Maintenance
LTS-om, migracija na sledeću verziju pada usred MVP-a ili produkcije.
Active LTS daje maksimalni runway pre nego što postane Maintenance.

**Ne koristimo pre-release** — canary/RC verzije nemaju garantovanu stabilnost
API-ja i biblioteke ih ne prate odmah. Nije prikladno za dugoročni projekat.

---

## Posledice

- Svaki novi framework ili runtime koji se uvodi u projekat automatski dobija
  najnoviji Active LTS bez ponovnog razmatranja
- Kad naša verzija pređe u Maintenance LTS, otvaramo istraživanje migracije —
  ali bez obaveze hitnog prelaska dok je bezbednosna podrška aktivna
- Jedini izuzetak: ako Active LTS ima kritičnu inkompatibilnost sa obaveznom
  bibliotekom, ostajemo na prethodnom LTS-u i dokumentujemo to kao novi ADR
  sa datumom ponovnog pregleda

# Architecture Decision Records (ADR)

Ovaj folder sadrži evidenciju arhitekturnih odluka donetih tokom razvoja WashBookPro platforme.

## Šta je ADR?

ADR (Architecture Decision Record) je kratak dokument koji beleži jednu arhitekturnu
odluku: kontekst u kom je doneta, samu odluku, razloge i posledice. Cilj je da
buduće verzije tima (ili solo developer mesecima kasnije) razumeju ZAŠTO je
nešto urađeno na određeni način — ne samo šta.

## Format fajla

```
ADR-NNN-title-in-english.md
```

- `NNN` je trocifren redni broj (001, 002, ...)
- `title-in-english` je kratki engleski naziv odluke, reči razdvojene crticom
- **Sadržaj** fajla je na srpskom latiničnom pismu

Primer: `ADR-003-database-per-tenant-vs-shared.md`

## Struktura svakog ADR-a

```markdown
# ADR-NNN: Naslov odluke

**Datum:** YYYY-MM-DD
**Status:** [Predloženo | Prihvaćeno | Odbijeno | Zamenjeno ADR-XXX]

## Kontekst
Opis situacije i problema koji je zahtevao donošenje odluke.

## Odluka
Jasna izjava šta je odlučeno.

## Razlozi
Zašto je ova odluka doneta — alternative koje su razmatrane i zašto su odbačene.

## Posledice
Šta ova odluka znači za projekat — prednosti, mane, obaveze koje iz nje proisticu.
```

## Status vrednosti

| Status | Značenje |
|--------|----------|
| Predloženo | Odluka je predložena, još nije prihvaćena |
| Prihvaćeno | Odluka je aktivna i važi |
| Odbijeno | Odluka je razmatrana i odbačena |
| Zamenjeno ADR-XXX | Ova odluka je zamenjena novom odlukom u ADR-XXX |

## Važno pravilo

**ADR-i se nikad ne brišu.** Ako se odluka promeni, pravi se novi ADR koji
u statusu navodi "Zamenjeno ADR-XXX", a stari ADR dobija status
"Zamenjeno ADR-YYY". Na taj način čuvamo celokupnu istoriju odlučivanja.

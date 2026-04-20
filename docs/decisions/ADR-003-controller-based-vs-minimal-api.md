# ADR-003: Controller-based API umesto Minimal API

**Datum:** 2026-04-21
**Status:** Prihvaćeno

## Kontekst

ASP.NET Core nudi dva pristupa za definisanje API endpointa: controller-based
i Minimal API. Potrebno je odabrati jedan pristup pre početka implementacije
modula.

## Odluka

Koristimo controller-based pristup (`[ApiController]`, `ControllerBase`).

## Razlozi

- Modularni monolit sa 6 domena zahteva jasnu organizaciju koda po klasama
- Controller-based je poznatiji C# developerima koji prelaze sa klasičnog ASP.NET
- Lakše grupisanje endpointa po modulu unutar jednog controllera
- Minimal API je optimalan za mikroservise i jednostavne projekte — ne odgovara
  ovom slučaju

## Posledice

- Svaki modul dobija sopstveni controller u svom folderu
- Routing konvencija: `[Route("api/[controller]")]` na svakom controlleru
- Minimal API ostaje opcija za eventualne jednostavne helper endpointe

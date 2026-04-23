# ADR-014: Mašina stanja rezervacije

**Datum:** 2026-04-23
**Status:** Prihvaćeno

## Kontekst

Rezervacija prolazi kroz nekoliko stanja tokom životnog ciklusa.

## Odluka

Definišemo sledeći tok stanja:

Pending → Confirmed → InProgress → Completed
↓
Cancelled (iz bilo kog stanja osim Completed)

## Razlozi

- Pending postoji jer online rezervacije mušterije čekaju potvrdu radnika
- Walk-in rezervacije (CreatedBy = "Worker") odmah dobijaju Confirmed
- Completed rezervacije se ne mogu menjati ni otkazivati

## Posledice

- Status se menja samo kroz PATCH /reservations/{id}/status
- Frontend terminal prikazuje akcije na osnovu trenutnog statusa

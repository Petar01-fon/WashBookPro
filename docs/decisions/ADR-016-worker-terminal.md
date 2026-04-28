# ADR-016: Worker terminal arhitektura

## Status
Prihvaćeno

## Kontekst
Potreban je interfejs za radnike autopraone koji omogućava upravljanje
rezervacijama u toku radnog dana sa tablet ili desktop uređaja.

## Odluke

### Polling umesto WebSocket-a
Za MVP koristi se polling svakih 30 sekundi. WebSocket integracija
planirana je za Fazu 2 kada bude jasno koliko je real-time ažurnost
kritična za operativni rad.

### Role-based pristup
Worker i Owner uloge imaju pristup terminalu. Uloga se čuva kao string
claim u JWT tokenu (`ClaimTypes.Role`). Vrednosti: `"Worker"`, `"Owner"`.

### Walk-in flow
Rezervacije kreirane sa terminala (`CreatedBy = "Worker"`) dobijaju
status `Confirmed` odmah, bez prolaska kroz `Pending` stanje.

### Touch-friendly UI
Terminal je dizajniran za tablet upotrebu — krupni elementi, veliki
touch targeti (min 44px), tamna tema pogodna za radni prostor.

## Posledice
- Polling generiše konstantan saobraćaj ka API-ju (1 req/30s po aktivnom terminalu)
- WebSocket migracija u Fazi 2 zahteva promene samo u `TerminalView.tsx`
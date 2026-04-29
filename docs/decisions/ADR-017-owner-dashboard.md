# ADR-017: Vlasnički dashboard arhitektura

## Status
Prihvaćeno

## Kontekst
Faza 1.4 uvodi vlasnički dashboard kao centralno mesto za upravljanje car wash poslovanjem.
Owner uloga zahteva poseban interfejs odvojen od worker terminala, sa pregledom rezervacija,
upravljanjem boksovima i poslovnim statistikama.

## Odluke

### Rutiranje i zaštita
- Dashboard je dostupan na `/dashboard/*` rutama
- `proxy.ts` proverava `washbook_authed` kolačić za sve rute osim javnih
- Provera Owner role se vrši na klijentskoj strani u `DashboardSidebar.tsx` — redirect na `/login` ako rola nije Owner
- Nakon logina, redirect se vrši prema roli: Owner → `/dashboard/reservations`, Worker → `/terminal/[slug]`

### Tenant slug
- `AuthResponse` proširena sa `TenantSlug` poljem
- Backend puni slug iz baze pri loginu (`LoginAsync` metoda)
- Frontend čuva slug u `localStorage` (`saveTenantSlug`) i čita ga via `getTenantSlug()`
- `RegisterAsync` i `RefreshAsync` vraćaju prazan string za slug (nije potreban)

### API sloj
- `apiFetch` u `api.ts` automatski čita token iz `localStorage` ako nije eksplicitno prosleđen
- `dashboard-api.ts` — centralne fetch funkcije za dashboard (rezervacije, boksovi, statistike)

### Boksovi (Bay CRUD)
- Novi `BaysController` odvojen od `ReservationsController`
- `GET /bays` — zaštićeno, Owner only, vraća sve boksove (aktivne i neaktivne)
- `GET /bays/public?tenantSlug=` — javno, za terminal i booking flow (zamena za stari `/bays`)
- `POST /bays`, `PATCH /bays/{id}`, `DELETE /bays/{id}` — Owner only
- Brisanje je soft delete (IsActive = false)

### Statistike
- `GET /reservations/stats?date=` — Owner only
- Vraća agregat za izabrani dan i tekući mesec
- Prihod se računa samo od Completed rezervacija

### Kalendar rezervacija
- Dnevni prikaz po kolonama boksova (trenutna implementacija)
- Nedeljni i mesečni prikaz su odloženi za zaseban task nakon Faze 1.4

### Walk-in dialog
- Slobodni datetime-local input zamenjen sa odvojenim date poljem i dropdown-om za vreme
- Vremenski slotovi: svakih 30 minuta od 08:00 do 17:30

## Posledice
- Role claim u JWT-u dolazi kao dugi Microsoft URI
  (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`) —
  `getRole()` u `auth.ts` mora koristiti pun URI kao ključ
- `BaysController` i `ReservationsController` ne smeju imati isti endpoint path —
  stari `GET /bays` u `ReservationsController` je uklonjen
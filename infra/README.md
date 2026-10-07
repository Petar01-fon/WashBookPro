# infra

Docker Compose fajlovi i deploy runbook za WashBookPro.

---

## 1. Lokalni razvoj

Iz `infra/`:

```
docker compose up --build -d
```

Backend: `http://localhost:8080` (Scalar API docs: `/scalar/v1`). Web:
`http://localhost:3000`. pgAdmin: `http://localhost:5050`. Migracije i dev
seed (tenant `dev-wash`, vlasnik, radnik, Bay 1, usluge) pokreću se automatski
pri startu backend-a u `Development` okruženju (ADR-025) — `docker compose
restart backend` nije potreban.

---

## 2. Produkcija — prvi put na novom serveru

Komande su za Ubuntu 24.04 na Hetzner VPS-u.

### 2.1 Docker

Instaliraj Docker Engine i Compose plugin po zvaničnom uputstvu:
https://docs.docker.com/engine/install/ubuntu/

### 2.2 Firewall

```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

### 2.3 Repo i konfiguracija

```
git clone <repo-url> washbook
cd washbook/infra
cp .env.prod.example .env.prod
```

Popuni `.env.prod` (vidi komentare u fajlu): domeni, `ACME_EMAIL`, baza,
`JWT_SECRET` (`openssl rand -base64 48`), Resend, Google OAuth.

### 2.4 DNS

Proveri da A zapisi za oba domena pokazuju na IP servera:

```
dig +short <WEB_DOMAIN>
dig +short <API_DOMAIN>
```

Oba moraju vratiti IP servera — u suprotnom Caddy ne može izdati HTTPS
sertifikat.

### 2.5 Pokretanje

Iz `infra/`, redom:

```
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 3. Prvi tenant

Jednokratna komanda `bootstrap-tenant` pravi prvi tenant + vlasnika + radnika.
Odbija da radi ako tenant (po slug-u) ili bilo koji od dva email-a već
postoje.

Napravi `infra/bootstrap.env` (privremeno, **nikad ga ne commit-uj**):

```
Bootstrap__TenantName=
Bootstrap__TenantSlug=
Bootstrap__Address=
Bootstrap__Phone=
Bootstrap__OpeningTime=08:00
Bootstrap__ClosingTime=18:00
Bootstrap__OwnerEmail=
Bootstrap__OwnerPassword=
Bootstrap__WorkerEmail=
Bootstrap__WorkerPassword=
```

Pokreni (iz `infra/`):

```
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm --env-from-file bootstrap.env backend bootstrap-tenant
```

Izlazni kodovi:

| Kod | Značenje |
|---|---|
| 0 | `Created` — tenant, vlasnik i radnik upisani |
| 1 | `InvalidConfiguration` — nedostaje ili je neispravan neki ključ (detalji u logu, bez vrednosti) |
| 2 | `TenantAlreadyExists` — tenant sa tim slug-om već postoji |
| 3 | `EmailAlreadyExists` — `OwnerEmail` ili `WorkerEmail` već postoji (preko svih tenanta) |

Posle uspeha (kod 0): **obriši `infra/bootstrap.env`**. Sadrži lozinke u
čistom tekstu.

---

## 4. Ažuriranje

Iz `infra/`:

```
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 5. Provera posle deploy-a

- `https://<API_DOMAIN>/health` → 200, validan sertifikat (bez `-k`)
- `https://<WEB_DOMAIN>/` se otvara u browseru, katanac ispravan
- login vlasnika na `/login` → dashboard; vlasnik dodaje boks i uslugu
- `https://<WEB_DOMAIN>/book/<slug>`: termini se prikazuju, rezervacija
  prolazi, success stranica (email: očekivano `emailSent: false` osim za
  adresu vlasnika Resend naloga)
- login radnika → terminal, rezervacija je vidljiva, walk-in prolazi
- sa lokalnog računara: `nc -vz <IP> 5432` i `nc -vz <IP> 8080` ne uspevaju
  (baza i backend nisu spolja dostupni, samo preko Caddy-ja)

---

## 6. Ručni koraci van servera

**Google Cloud Console** — bez ovoga Google login ne radi (email/lozinka
radi nezavisno):

- Authorized redirect URI: `https://<API_DOMAIN>/auth/google/callback`
- Authorized JavaScript origin: `https://<WEB_DOMAIN>`

**Resend** — do M3 (verifikovan domen) email stiže samo na adresu vlasnika
Resend naloga. `emailSent: false` za ostale adrese je očekivano ponašanje,
ne greška.

---

## 7. Šta nije pokriveno do M3

- Automatski backup baze i provera vraćanja iz backup-a
- Monitoring i centralizovani logovi
- Resend: verifikovan domen (SPF/DKIM)
- NU1903 (`Microsoft.OpenApi`), PWA manifest

Vidi `docs/PROJECT_STATE.md`, milestone M3.

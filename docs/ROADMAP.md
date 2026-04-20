# Roadmap — WashBookPro

## Faza 0 — Temelji (Nedelja 1–12) · **U toku**

Postavljanje razvojnog okruženja, scaffold svih aplikacija i deployment pipeline-a.

| Podfaza | Period      | Opis                                                         | Status         |
|---------|-------------|--------------------------------------------------------------|----------------|
| 0.1     | Nedelja 1   | Repo setup + dokumentacioni temelj                           | Završeno       |
| 0.2     | Nedelja 1-2 | Lokalno razvojno okruženje: Node.js, PostgreSQL, Docker      | Završeno       |
| 0.3     | Nedelja 3-4 | ASP.NET Core 10 backend scaffold sa modulima                 | Planirano      |
| 0.4     | Nedelja 5-6 | PostgreSQL + EF Core + multi-tenant temelj                   | Planirano      |
| 0.5     | Nedelja 7-8 | JWT autentikacija (registracija + login + refresh)           | Planirano      |
| 0.6     | Nedelja 9   | Next.js 15 web scaffold                                      | Planirano      |
| 0.7     | Nedelja 10  | React Native + Expo mobilni scaffold                         | Planirano      |
| 0.8     | Nedelja 11-12 | Docker Compose + CI/CD + deployment                        | Planirano      |

---

## Faza 1 — MVP (Mesec 3–5) · Planirano

MVP za prvu autopraonicuu: rezervacije, terminal za radnike, vlasnički dashboard.

- Upravljanje rezervacijama (kreiranje, izmena, otkazivanje)
- Terminal za radnike (pregled dnevnog rasporeda, ažuriranje statusa)
- Vlasnički dashboard (pregled prihoda, zaposlenost kapaciteta)
- Osnovna notifikaciona podrška (email potvrde)

---

## Faza 2 — Proširenje (Mesec 6–8) · Planirano

ANPR zaštita od krađe, B2B portal, notifikacije, mobilna aplikacija u punom obimu.

- ANPR integracija: automatsko prepoznavanje tablica na ulazu/izlazu
- B2B portal: samouslužna registracija poslovnih klijenata
- Notifikacije: SMS i Viber putem Infobip-a
- Mobilna aplikacija: kompletne funkcionalnosti za radnike i klijente
- Integracija skladišta objekata (MinIO)

---

## Faza 3 — SaaS zrelost (Mesec 9–11) · Planirano

Platforma sprema za scale: samouslužni onboarding, online plaćanja, eFaktura, pretplatna naplata.

- Samouslužni onboarding novih klijenata (bez manuelnog podešavanja)
- Online plaćanja putem AllSecure/Monri
- Integracija sa eFaktura sistemom (Srbija)
- Pretplatna naplata za SaaS licence

---

## Faza 4 — Rast (Mesec 12+) · Planirano

Optimizacija, napredne funkcije i skaliranje na više klijenata.

- Napredna analitika i izveštavanje
- Optimizacija performansi i troškova infrastrukture
- Nove funkcionalnosti prema povratnim informacijama klijenata

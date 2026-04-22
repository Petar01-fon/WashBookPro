# ADR-012: expo-secure-store za čuvanje JWT tokena

**Datum:** 2026-04-22
**Status:** Prihvaćeno

## Kontekst

Na web scaffold-u (ADR-010) privremeno se koristi localStorage za JWT token,
uz napomenu da se migrira na httpOnly cookie u Fazi 1. Na mobilnoj aplikaciji
treba odabrati ekvivalentno rešenje koje je sigurno za čuvanje kredencijala.
Razmatrane opcije su bile AsyncStorage i expo-secure-store.

## Odluka

Koristimo `expo-secure-store` za čuvanje JWT tokena na mobilnoj aplikaciji.

## Razlozi

- `expo-secure-store` koristi Keychain (iOS) i Keystore (Android) —
  sistemski sigurne enklave, ekvivalent httpOnly cookie bezbednosti na webu.
- AsyncStorage čuva podatke kao cleartext na disku — nije prihvatljivo
  za JWT tokene koji daju pristup korisničkom nalogu.
- Za razliku od web rešenja (ADR-010), SecureStore je permanentno ispravno
  rešenje i ne zahteva migraciju u kasnijim fazama.

## Posledice

- Token nije dostupan JavaScript kodu van expo-secure-store API-ja,
  što smanjuje rizik od XSS napada.
- Svi pozivi ka SecureStore su asinhroni — koristi se async/await na
  svim mestima gde se čita ili upisuje token.
- Na Expo Go funkcioniše identično kao na produkcijskom buildu.
- Ako korisnik deinstalira aplikaciju, token se automatski briše
  (Keychain na iOS može da zadrži podatke — treba voditi računa pri
  prvom pokretanju nakon reinstalacije).

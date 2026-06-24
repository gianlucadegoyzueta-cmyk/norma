# Norma Mobile (iOS + Android)

Guscio nativo [Capacitor](https://capacitorjs.com/) che porta Norma sugli store **riusando
l'app web live**. La webview carica `app.norma.casa` (configurabile via `NORMA_APP_URL`); il
login funziona senza modifiche perché l'origin è lo stesso (cookie di sessione first-party).

Lo strato nativo (push, biometria, deep link, splash/status bar) vive nel web app di Norma
(`src/lib/native/`), perché è quel bundle a girare nella webview. Vedi
`capacitor.config.ts` per i dettagli.

## Prerequisiti (sul Mac)

- Node ≥ 20, Xcode (iOS) e Android Studio (Android) installati.
- Account **Apple Developer** (99 €/anno) e **Google Play Console** (25 € una-tantum) — vedi
  `../NEEDS-HUMAN.md`.
- ⚠️ L'ambiente CI remoto è Linux: iOS si costruisce **solo** su macOS.

## Primo setup

```bash
cd mobile
npm install

# Genera icone e splash da assets/ (sfondo avorio di brand)
npm run assets:generate -- --iconBackgroundColor '#f7f2e8' --splashBackgroundColor '#f7f2e8' --splashBackgroundColorDark '#f7f2e8'

# Aggiunge le piattaforme native (cartelle ios/ e android/, gitignored)
npx cap add ios
npx cap add android

# Allinea config + plugin + asset alle piattaforme native
npx cap sync
```

> `assets/icon.png` e `assets/splash.png` sono placeholder a 512px copiati dal brand. Per la
> resa store sostituiscili con: icona **1024×1024** e splash **2732×2732** (logo centrato su
> avorio `#f7f2e8`), poi rilancia `assets:generate`.

## Sviluppo

```bash
npm run cap:run:ios       # simulatore iOS
npm run cap:run:android   # emulatore/device Android
npm run cap:ios           # apre il progetto in Xcode
npm run cap:android       # apre il progetto in Android Studio
```

Per puntare a un'anteprima invece della produzione, crea `.env` da `.env.example` e imposta
`NORMA_APP_URL` (poi `npx cap sync`).

## Deep link (Universal Links / App Links)

I file di associazione sono serviti dal web app di Norma:

- iOS: `https://app.norma.casa/.well-known/apple-app-site-association`
- Android: `https://app.norma.casa/.well-known/assetlinks.json`

Da completare con valori reali prima del rilascio (vedi `NEEDS-HUMAN.md`):

- **Apple**: sostituire `TEAMID` con l'App ID Prefix (Team ID) nel file AASA.
- **Android**: inserire il **SHA-256** del certificato di firma in `assetlinks.json`
  (`keytool -list -v -keystore <keystore>` o da Play Console → App integrity).

## Build & rilascio (Fastlane)

Le lane sono in `fastlane/` (placeholder da completare con i dati account):

```bash
bundle exec fastlane ios beta        # build + upload TestFlight
bundle exec fastlane android beta    # build + upload Play Internal testing
```

Segreti di firma (certificati, profili, keystore, API key App Store/Play) **mai nel repo** —
usare le variabili d'ambiente / il keychain locale / i secret del CI.

## Checklist store (umana)

- [ ] Account Apple Developer + Google Play attivi
- [ ] Asset icona/splash ad alta risoluzione
- [ ] Schede store localizzate (it/en/de/fr/es)
- [ ] Privacy: Apple Privacy Nutrition Label + `PrivacyInfo.xcprivacy`, Google Data Safety
- [ ] Permessi descritti (NSCameraUsageDescription per lo scanner — fase 3, Notifiche)
- [ ] Deep link `.well-known` con TEAMID/SHA-256 reali
- [ ] Build firmata caricata su TestFlight / Play Internal
- [ ] Review superata

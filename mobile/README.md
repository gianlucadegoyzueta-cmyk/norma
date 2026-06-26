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

## Config nativa (dopo `npx cap add`)

I progetti `ios/` e `android/` sono gitignored e vengono generati sul Mac. Subito dopo,
applica permessi, privacy manifest e capabilities seguendo **`native-config/README.md`**
(stringhe `NSCameraUsageDescription`/`NSFaceIDUsageDescription` localizzate, `PrivacyInfo.xcprivacy`,
permessi Android, FCM `google-services.json`, Associated Domains).

## Schede store (metadata)

Le schede localizzate (it/en/de/fr/es) sono **già pronte** in:

- iOS (`deliver`): `fastlane/metadata/<locale>/` (name, subtitle, description, keywords, …)
- Android (`supply`): `fastlane/metadata/android/<locale>/`

> ⚠️ La copy è **DRAFT**: rivedila tu + un legale prima del submit (accuratezza normativa).
> Mancano gli **screenshot** (richiesti dagli store) e l'**icona/splash ad alta risoluzione**.

## Build & rilascio (Fastlane)

Le lane in `fastlane/Fastfile` sono **reali**; i segreti si leggono da variabili d'ambiente
(`bundle install` la prima volta — vedi `Gemfile`):

```bash
bundle exec fastlane ios beta         # build firmata + upload TestFlight
bundle exec fastlane android beta     # build firmata (AAB) + upload Play Internal
bundle exec fastlane ios metadata     # solo schede store su App Store Connect
bundle exec fastlane android metadata # solo schede store su Play
```

Env attesi (vedi `native-config/README.md` per dove prenderli): `ASC_KEY_ID`, `ASC_ISSUER_ID`,
`ASC_KEY_P8`/`ASC_KEY_PATH`, `APPLE_ID`, `APPLE_TEAM_ID`, `ASC_TEAM_ID`, `MATCH_GIT_URL`+`MATCH_PASSWORD`
(iOS); `ANDROID_KEYSTORE_*`, `SUPPLY_JSON_KEY` (Android).

Segreti di firma (certificati, profili, keystore, API key App Store/Play, `google-services.json`)
**mai nel repo** — usare le variabili d'ambiente / il keychain locale / i secret del CI.

## Prima del submit — dipendenze esterne

- **Privacy policy URL** + **Support URL** pubblici: obbligatori per entrambi gli store.
  - **Privacy:** `https://norma.casa/privacy` e `https://norma.casa/termini` **esistono già** (in
    `norma-marketing`), ma sono **BOZZE** con campi `[DA COMPILARE]` (titolare, P.IVA, PEC) e nota
    "revisionare da un professionista prima del lancio" → **da finalizzare legalmente** prima del
    submit.
  - **Support URL:** usa `https://norma.casa` (sezione Supporto) o l'email di contatto. NON usare
    `app.norma.casa/support`: è dietro login, non adatto come URL pubblico.
- **Apple — abbonamenti/IAP (rischio review):** Norma vende l'abbonamento via web (Stripe). Apple
  può contestare un'app che sblocca funzioni a pagamento senza IAP. L'app è companion di un SaaS
  B2B (gestionale) → di norma accettata, ma il listing **non deve** linkare all'acquisto esterno.
  Da valutare prima del submit (eventuale account-type "non consumer" / posizionamento B2B).

## Checklist store

Pronto in-repo (questa PR):

- [x] Schede store localizzate it/en/de/fr/es (`fastlane/metadata/`) — **DRAFT da rivedere**
- [x] `PrivacyInfo.xcprivacy` + stringhe permessi localizzate (`native-config/`)
- [x] Lane Fastlane reali (TestFlight / Play Internal) con segreti via env
- [x] Permessi Android documentati (`native-config/android-permissions.md`)

Da fare da te (richiede account / Mac):

- [ ] Account Apple Developer + Google Play attivi
- [ ] `npx cap add ios/android` + applica `native-config/` (permessi, privacy, capabilities)
- [ ] Asset icona 1024×1024 / splash 2732×2732 + **screenshot** store
- [ ] Rivedere la copy DRAFT (tu + legale) e compilare Privacy Nutrition Label / Data Safety
- [ ] Deep link `.well-known` con **TEAMID** (AASA) e **SHA-256** (assetlinks) reali
- [ ] Privacy policy URL + Support URL pubblici (vedi sopra)
- [ ] Build firmata su TestFlight / Play Internal → review

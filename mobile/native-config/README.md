# Config nativa — cosa applicare dopo `npx cap add`

Questa cartella contiene file e istruzioni che **non** vivono nei progetti nativi finché non li
generi sul Mac (`ios/`, `android/` sono gitignored). Dopo `npx cap add ios && npx cap add android`,
applica quanto segue. Niente qui richiede un account; i **valori che dipendono dagli account** sono
elencati in fondo come placeholder da riempire.

## iOS (dopo `npx cap add ios`)

1. **Privacy manifest**: copia `PrivacyInfo.xcprivacy` in `ios/App/App/PrivacyInfo.xcprivacy` e
   aggiungilo al target `App` in Xcode. Xcode segnala in validazione eventuali "required reason
   API" mancanti dei plugin → aggiungile all'array `NSPrivacyAccessedAPITypes`.
2. **Stringhe permessi (localizzate)**: in Xcode abilita le lingue it/en/de/fr/es (Project →
   Localizations) e copia ogni `ios-permissions/<lang>.lproj/InfoPlist.strings` nel relativo
   `.lproj`. In alternativa, incolla almeno `NSCameraUsageDescription` e `NSFaceIDUsageDescription`
   (dal file `it`/`en`) in `ios/App/App/Info.plist`.
3. **Capabilities** (Xcode → Signing & Capabilities, target App):
   - **Push Notifications**
   - **Associated Domains** → `applinks:app.norma.casa` (per gli Universal Links)
   - (Background Modes → Remote notifications, se vuoi le push in background)
4. **APNs**: in Apple Developer crea una **APNs Auth Key (.p8)**; serve al canale push lato
   server (vedi `NEEDS-HUMAN.md §11`).

## Android (dopo `npx cap add android`)

1. **Permessi**: vedi `android-permissions.md` (CAMERA, POST_NOTIFICATIONS).
2. **FCM**: metti `google-services.json` in `android/app/` (gitignored).

## Deep link — file `.well-known` (nel web app `norma`)

Già serviti da `app.norma.casa`, ma con **placeholder** da sostituire al go-live:

- `public/.well-known/apple-app-site-association`: sostituisci `TEAMID` con il tuo **Team ID**
  (Apple Developer → Membership → Team ID), formato `TEAMID.casa.norma.app`.
- `public/.well-known/assetlinks.json`: sostituisci `REPLACE_WITH_SHA256_FINGERPRINT_OF_SIGNING_CERT`
  con l'impronta **SHA-256** del certificato di firma:
  `keytool -list -v -keystore <keystore.jks> -alias <alias>` oppure Play Console → Test e
  versioni → Integrità app → impronte digitali del certificato.

## Valori che dipendono dagli account (da riempire quando li avrai)

| Valore                                                | Dove si prende                                      | Dove va                                   |
| ----------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **Team ID** (Apple)                                   | Apple Developer → Membership                        | AASA + `fastlane/Appfile`                 |
| **App Store Connect API key** (.p8 + key id + issuer) | App Store Connect → Users and Access → Integrations | env per Fastlane (`upload_to_testflight`) |
| **APNs Auth Key** (.p8)                               | Apple Developer → Keys                              | segreti server (push)                     |
| **SHA-256** firma Android                             | keystore / Play App Integrity                       | `assetlinks.json`                         |
| **google-services.json** (FCM)                        | Firebase Console                                    | `android/app/`                            |
| **Play service account JSON**                         | Google Cloud → Play Console API                     | env per Fastlane (`upload_to_play_store`) |
| **Keystore** (.jks) + password                        | lo generi tu (`keytool`)                            | env/keychain per la firma release         |

Tutti questi sono **segreti**: mai nel repo. Usa keychain locale, variabili d'ambiente o i secret
del CI.

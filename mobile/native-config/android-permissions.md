# Permessi Android — da aggiungere dopo `npx cap add android`

Capacitor genera `android/app/src/main/AndroidManifest.xml`. I plugin di Norma richiedono questi
permessi/elementi. Aggiungili dentro `<manifest>` (fuori da `<application>` per i `uses-permission`).

```xml
<!-- Scanner documento al check-in (@capacitor/camera + ML Kit text recognition) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Notifiche push (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

> Internet è già concesso da Capacitor. La biometria (`@aparajita/capacitor-biometric-auth`)
> dichiara da sé `USE_BIOMETRIC`. La camera **non** richiede una stringa di motivazione su Android
> (a differenza di iOS): il prompt di sistema basta.

## Firebase Cloud Messaging (FCM) — per le push

1. Crea il progetto Firebase e l'app Android (package `casa.norma.app`).
2. Scarica `google-services.json` e mettilo in `android/app/google-services.json`
   (**gitignored**, mai nel repo).
3. Il plugin `@capacitor/push-notifications` su Android usa FCM: il `google-services.json` +
   il plugin Gradle sono sufficienti. Lato server serve `FCM_SERVICE_ACCOUNT_JSON` in env
   (Vercel) — vedi `FcmPushSender.ts`.

## App Links (deep link) — verifica del dominio

L'`assetlinks.json` è già servito da `https://app.norma.casa/.well-known/assetlinks.json`, ma con
**SHA-256 placeholder**. Inserisci l'impronta reale del certificato di firma (vedi `README.md` di
questa cartella) e Android verificherà automaticamente i link a `app.norma.casa`.

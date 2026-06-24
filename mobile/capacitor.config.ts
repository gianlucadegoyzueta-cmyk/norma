import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configurazione del guscio nativo Norma.
 *
 * Strategia: NON facciamo lo static export dell'app (Norma è SSR: server actions, next-auth,
 * Prisma). La webview carica direttamente l'app web LIVE tramite `server.url`. Conseguenza
 * chiave: il codice JS che gira nella webview è il bundle servito da `app.norma.casa`, quindi
 * il bridge nativo (push, biometria, deep link) vive nel web app di Norma (src/lib/native/),
 * non qui. La cartella `www/` è solo un fallback offline.
 *
 * Auth: caricando l'origin `app.norma.casa`, il cookie di sessione JWT
 * (`__Secure-authjs.session-token`) è first-party → il login funziona senza modifiche al web.
 *
 * `NORMA_APP_URL` permette di puntare a un'anteprima/staging in sviluppo (es. tunnel locale).
 */
const appUrl = process.env.NORMA_APP_URL ?? "https://app.norma.casa";

const config: CapacitorConfig = {
  appId: "casa.norma.app",
  appName: "Norma",
  // Fallback offline; il contenuto reale arriva da server.url.
  webDir: "www",
  server: {
    url: appUrl,
    // La webview deve poter navigare sul dominio app + il flusso OAuth di Google.
    allowNavigation: ["app.norma.casa", "norma.casa", "accounts.google.com"],
  },
  ios: {
    // Sfondo della webview a tema avorio (evita flash bianco al boot/scroll bounce).
    backgroundColor: "#f7f2e8",
    contentInset: "always",
  },
  android: {
    backgroundColor: "#f7f2e8",
  },
  plugins: {
    SplashScreen: {
      // Lo splash viene nascosto dal web app quando è pronto (src/lib/native/bootstrap).
      launchAutoHide: false,
      backgroundColor: "#f7f2e8",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      // Testo scuro su sfondo avorio chiaro.
      style: "LIGHT",
      backgroundColor: "#f7f2e8",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

/**
 * Inizializzazione dello strato nativo, eseguita una sola volta lato client quando l'app gira
 * nel guscio Capacitor. Vedi `index.ts` per le regole (feature-detect, import dinamici, fail-open).
 *
 * Cosa fa in PR1 (nessun backend, nessuna migrazione):
 *  - status bar + nasconde lo splash quando l'app è pronta;
 *  - registra il device alle push e instrada il tap della notifica (consegna server = PR2);
 *  - gestisce i deep link (Universal/App Links) verso /checkin/[token] e /auth/reset;
 *  - tasto "indietro" Android e apertura link esterni in un browser di sistema;
 *  - blocco biometrico opzionale (opt-in, default off).
 */
import { isNative, isBiometricLockEnabled, getPlatform } from "./index";

let started = false;

/** Naviga nella webview verso un path interno dell'app. */
function navigateTo(path: string): void {
  if (!path || !path.startsWith("/")) return;
  try {
    window.location.assign(path);
  } catch {
    /* no-op */
  }
}

/** Estrae il path interno da un URL di deep link su uno dei nostri domini. */
function pathFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith("norma.casa")) return u.pathname + u.search;
    return null;
  } catch {
    return null;
  }
}

async function setupStatusBarAndSplash(): Promise<void> {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Testo scuro su sfondo avorio chiaro.
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* status bar non disponibile: ignora */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash non disponibile: ignora */
  }
}

async function setupDeepLinks(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");
    // App aperta da un deep link mentre era chiusa o in background.
    App.addListener("appUrlOpen", (event) => {
      const path = pathFromUrl(event.url);
      if (path) navigateTo(path);
    });
    // Tasto "indietro" Android: torna nella history della webview, altrimenti minimizza.
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.minimizeApp().catch(() => {});
    });
  } catch {
    /* @capacitor/app non disponibile: ignora */
  }
}

/** Invia il device token al backend per la consegna push (POST /api/devices). Best-effort. */
async function registerDeviceToken(token: string): Promise<void> {
  const platform = getPlatform();
  if (platform === "web") return;
  try {
    await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, platform: platform === "ios" ? "IOS" : "ANDROID" }),
    });
  } catch {
    /* offline o non loggato: si ritenterà alla prossima registrazione */
  }
}

async function setupPush(): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      // Registra il token sul backend (PR2). Best-effort: un errore non deve rompere l'app.
      void registerDeviceToken(token.value);
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[norma-native] push registration error", err);
    });
    // Tap su una notifica: se porta un path, naviga lì (deep link applicativo).
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const path = action.notification?.data?.path;
      if (typeof path === "string") navigateTo(path);
    });
  } catch {
    /* push non disponibili: ignora */
  }
}

async function setupExternalLinks(): Promise<void> {
  // I link esterni (non su norma.casa) vanno aperti nel browser di sistema, non nella webview,
  // per non perdere la sessione né uscire dal contesto app.
  try {
    const { Browser } = await import("@capacitor/browser");
    document.addEventListener(
      "click",
      (e) => {
        const anchor = (e.target as HTMLElement | null)?.closest?.("a");
        const href = anchor?.getAttribute("href");
        if (!href) return;
        let url: URL;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (url.hostname.endsWith("norma.casa")) return; // interno: resta in webview
        e.preventDefault();
        void Browser.open({ url: url.href }).catch(() => {});
      },
      { capture: true },
    );
  } catch {
    /* browser plugin non disponibile: ignora */
  }
}

/** Blocco biometrico opt-in: mostra un overlay che si sblocca con Face/Touch ID. Fail-open. */
async function setupBiometricLock(): Promise<void> {
  if (!isBiometricLockEnabled()) return;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const info = await BiometricAuth.checkBiometry();
    if (!info.isAvailable) return; // nessuna biometria: non bloccare (evita lockout)

    const overlay = createLockOverlay();
    document.body.appendChild(overlay.el);

    const tryUnlock = async () => {
      try {
        await BiometricAuth.authenticate({
          reason: "Sblocca Norma",
          cancelTitle: "Annulla",
          allowDeviceCredential: true,
          iosFallbackTitle: "Usa codice",
        });
        overlay.el.remove();
      } catch {
        overlay.showRetry();
      }
    };
    overlay.onRetry(tryUnlock);
    await tryUnlock();
  } catch {
    /* biometria non disponibile: fail-open, nessun blocco */
  }
}

function createLockOverlay() {
  const el = document.createElement("div");
  el.setAttribute("role", "dialog");
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "background:#f7f2e8",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:16px",
    "padding:24px",
    "text-align:center",
    "font-family:ui-sans-serif,system-ui,-apple-system,sans-serif",
    "color:#211c15",
  ].join(";");
  const title = document.createElement("h1");
  title.textContent = "Norma è bloccata";
  title.style.cssText = "font-size:1.25rem;margin:0";
  const retry = document.createElement("button");
  retry.textContent = "Sblocca";
  retry.style.cssText =
    "background:#bc4b2b;color:#f7f2e8;border:0;border-radius:12px;padding:12px 24px;font-size:1rem;font-weight:600;display:none";
  el.append(title, retry);
  return {
    el,
    showRetry: () => {
      retry.style.display = "block";
    },
    onRetry: (fn: () => void) => retry.addEventListener("click", fn),
  };
}

/** Punto d'ingresso unico, idempotente. Chiamato da NativeBootstrap (client) in useEffect. */
export async function bootstrapNative(): Promise<void> {
  if (started || !isNative()) return;
  started = true;
  await setupBiometricLock();
  await Promise.allSettled([
    setupStatusBarAndSplash(),
    setupDeepLinks(),
    setupPush(),
    setupExternalLinks(),
  ]);
}

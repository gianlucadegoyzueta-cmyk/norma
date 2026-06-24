/**
 * Bridge web ↔ nativo (Capacitor).
 *
 * Norma gira come app web SSR; il guscio nativo (cartella `mobile/`) carica l'app LIVE in una
 * webview tramite `server.url`. Conseguenza: il codice che gira nella webview è QUESTO bundle,
 * quindi le funzioni native vivono qui.
 *
 * Regole d'oro per non toccare il web desktop:
 *  - tutto è feature-detected via `isNative()`;
 *  - i plugin Capacitor si caricano SOLO con `import()` dinamico, lato client, mai durante l'SSR;
 *  - ogni interazione nativa è in try/catch: un errore nello strato nativo non deve mai rompere
 *    l'app (fail-open).
 *
 * `@capacitor/core` è una dipendenza leggera e SSR-safe: in web restituisce `web` come piattaforma.
 */
import { Capacitor } from "@capacitor/core";

/** True solo dentro il guscio nativo iOS/Android (mai su web/desktop/PWA browser). */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Piattaforma corrente: "ios" | "android" | "web". */
export function getPlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

const BIOMETRIC_LOCK_KEY = "norma:biometric-lock";

/** Indica se l'utente ha attivato il blocco biometrico (opt-in, default off). */
export function isBiometricLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BIOMETRIC_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

/** Attiva/disattiva il blocco biometrico (chiamabile da una futura UI in /account). */
export function setBiometricLock(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(BIOMETRIC_LOCK_KEY, "1");
    else window.localStorage.removeItem(BIOMETRIC_LOCK_KEY);
  } catch {
    /* no-op */
  }
}

export { bootstrapNative } from "./bootstrap";

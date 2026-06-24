"use client";

import { useEffect } from "react";

/**
 * Monta lo strato nativo (Capacitor) una sola volta, lato client. È un no-op completo sul web
 * desktop/PWA: `bootstrapNative()` esce subito se `!isNative()`. Renderizza `null` (nessun DOM).
 *
 * Importiamo il bridge dinamicamente dentro l'effect così `@capacitor/*` non finisce mai nel
 * percorso SSR e non pesa sul first paint del web.
 */
export function NativeBootstrap(): null {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { bootstrapNative } = await import("@/lib/native");
        if (!cancelled) await bootstrapNative();
      } catch {
        /* strato nativo non disponibile: ignora */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

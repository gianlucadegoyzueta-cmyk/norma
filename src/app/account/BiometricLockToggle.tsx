"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

/**
 * Toggle del blocco biometrico (Face/Touch ID all'apertura dell'app). Visibile SOLO in app nativa
 * (su web è un no-op invisibile). Stato client-only in localStorage via il bridge nativo — nessun
 * dato server. Default off; l'host decide.
 */
export function BiometricLockToggle() {
  const [native, setNative] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/native").then((n) => {
      if (cancelled) return;
      setNative(n.isNative());
      setEnabled(n.isBiometricLockEnabled());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!native) return null;

  const toggle = (on: boolean) => {
    setEnabled(on);
    void import("@/lib/native").then((n) => n.setBiometricLock(on));
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
      <label htmlFor="biometric-lock" className="grid gap-0.5">
        <span className="text-sm font-medium">Blocco con Face/Touch ID</span>
        <span className="text-muted-foreground text-xs">
          Richiedi lo sblocco biometrico all&apos;apertura dell&apos;app.
        </span>
      </label>
      <Switch
        id="biometric-lock"
        checked={enabled}
        onCheckedChange={toggle}
        aria-label="Blocco biometrico"
      />
    </div>
  );
}

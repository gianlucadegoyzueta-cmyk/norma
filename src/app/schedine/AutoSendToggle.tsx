"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCredentialAutoSendAction } from "./actions";

/**
 * Toggle OPT-IN per credenziale all'auto-invio schedulato. È solo un flag (reversibile): non invia
 * nulla. L'auto-invio reale resta dietro la tripla barriera (env ALLOGGIATI_CRON_ENABLED +
 * CRON_SECRET + questo flag), perciò qui mostriamo chiaramente che da solo non basta.
 */
export function AutoSendToggle({
  credentialId,
  initialEnabled,
  active,
}: {
  credentialId: string;
  initialEnabled: boolean;
  active: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      const res = await setCredentialAutoSendAction(credentialId, next);
      if (res.ok) {
        setEnabled(next);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  if (!active) {
    return (
      <span className="text-muted-foreground text-xs">
        Attiva la credenziale per poter abilitare l&apos;auto-invio.
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Auto-invio schedulato"
          disabled={pending}
          onClick={toggle}
          className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
          style={{ backgroundColor: enabled ? "var(--terracotta)" : "var(--hairline)" }}
        >
          <span
            className="inline-block size-4 rounded-full bg-white transition-transform"
            style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }}
          />
        </button>
        <span className="text-sm">
          {enabled ? "Auto-invio attivo" : "Auto-invio disattivo"}
          {pending ? "…" : ""}
        </span>
      </span>
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </span>
  );
}

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
  label,
  initialEnabled,
  active,
}: {
  credentialId: string;
  label: string;
  initialEnabled: boolean;
  active: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Conferma esplicita richiesta SOLO sull'attivazione (OFF→ON): accendere l'auto-invio reale
  // agli enti è delicato; spegnerlo è sicuro e resta immediato.
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function persist(next: boolean) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await setCredentialAutoSendAction(credentialId, next);
      if (res.ok) {
        setEnabled(next);
        setConfirming(false);
        setSuccess(next ? "Auto-invio attivato." : "Auto-invio disattivato.");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function toggle() {
    // Attivazione → passa dalla conferma; disattivazione → immediata (reversibile, sicura).
    if (!enabled) {
      setError(null);
      setSuccess(null);
      setConfirming(true);
      return;
    }
    persist(false);
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
          disabled={pending || confirming}
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

      {confirming ? (
        <span className="border-border mt-1 grid gap-2 rounded-md border p-3 text-left">
          <span className="text-muted-foreground block text-xs">
            Attivando l&apos;auto-invio, Norma invierà le schedine di{" "}
            <strong className="text-foreground">{label}</strong> agli enti in automatico secondo le
            tue regole, all&apos;orario programmato. Partiranno{" "}
            <strong>solo le schedine validate dal Test</strong>; quelle bocciate restano da rivedere
            e non partono mai. Puoi disattivarlo in qualsiasi momento.
          </span>
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => persist(true)}
              className="bg-primary text-primary-foreground inline-flex h-8 items-center rounded-md px-3 text-xs font-medium disabled:opacity-60"
            >
              {pending ? "Attivo…" : "Attiva auto-invio"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="text-muted-foreground inline-flex h-8 items-center rounded-md px-3 text-xs font-medium disabled:opacity-60"
            >
              Annulla
            </button>
          </span>
        </span>
      ) : null}

      {success ? (
        <span role="status" className="text-success text-xs">
          {success}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </span>
  );
}

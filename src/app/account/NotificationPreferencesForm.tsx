"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setNotificationPreferenceAction } from "./actions";

type Consent = { alloggiati: boolean; turismo: boolean };

/**
 * Toggle del consenso alle notifiche push, GRANULARE PER PILASTRO (safeguard #1). Aggiornamento
 * ottimistico + rollback se l'azione fallisce. La consegna reale resta gated a valle
 * (PUSH_ENABLED + chiavi): qui si esprime solo la preferenza.
 */
export function NotificationPreferencesForm({ initial }: { initial: Consent }) {
  const [pref, setPref] = useState<Consent>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (pillar: keyof Consent, enabled: boolean) => {
    const prev = pref[pillar];
    setPref((p) => ({ ...p, [pillar]: enabled }));
    setMsg(null);
    start(async () => {
      const res = await setNotificationPreferenceAction(pillar, enabled);
      if (res && !res.ok) {
        setPref((p) => ({ ...p, [pillar]: prev })); // rollback
        setMsg(res.message);
      }
    });
  };

  const ROWS: { pillar: keyof Consent; title: string; desc: string }[] = [
    {
      pillar: "alloggiati",
      title: "Alloggiati",
      desc: "Promemoria schedine in coda e scadenze Alloggiati.",
    },
    {
      pillar: "turismo",
      title: "Turismo",
      desc: "Promemoria tassa di soggiorno e movimento ISTAT.",
    },
  ];

  return (
    <div className="grid w-full gap-3">
      {ROWS.map((r) => (
        <div key={r.pillar} className="flex items-center justify-between gap-3">
          <label htmlFor={`pref-${r.pillar}`} className="grid gap-0.5">
            <span className="text-sm font-medium">{r.title}</span>
            <span className="text-muted-foreground text-xs">{r.desc}</span>
          </label>
          <Switch
            id={`pref-${r.pillar}`}
            checked={pref[r.pillar]}
            onCheckedChange={(v) => toggle(r.pillar, v)}
            disabled={pending}
            aria-label={`Notifiche ${r.title}`}
          />
        </div>
      ))}
      {msg && (
        <p className="text-destructive text-xs" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markIstatSubmittedAction } from "./actions";

/**
 * Registra (o aggiorna) un invio ISTAT già fatto a mano sul portale: è un audit-trail personale,
 * Norma NON trasmette. Se i numeri del report sono cambiati dopo la registrazione (`stale`),
 * lo segnala invece di mostrare un falso "tutto a posto".
 */
export function IstatSubmitButton({
  period,
  submittedLabel,
  stale,
  disabled,
}: {
  period: string;
  submittedLabel: string | null;
  stale?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    // Aggiornare una registrazione esistente sovrascrive la data di invio (dato di compliance):
    // micro-conferma prima di sostituire la data precedente.
    if (
      submittedLabel &&
      !window.confirm(`Aggiorno la data della registrazione da ${submittedLabel} a oggi?`)
    ) {
      return;
    }
    start(async () => {
      const res = await markIstatSubmittedAction(period);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {submittedLabel &&
        (stale ? (
          <span className="text-warning-foreground text-xs font-medium">
            Invio registrato il {submittedLabel} · numeri cambiati dopo
          </span>
        ) : (
          <span className="text-success text-xs font-medium">
            Invio registrato il {submittedLabel}
          </span>
        ))}
      <Button
        type="button"
        size="sm"
        variant={submittedLabel ? "outline" : "default"}
        onClick={onClick}
        disabled={disabled || pending}
        title="Promemoria personale: Norma non trasmette al portale regionale, l'invio lo fai tu."
      >
        {submittedLabel ? "Aggiorna registrazione" : "Registra l'invio fatto"}
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

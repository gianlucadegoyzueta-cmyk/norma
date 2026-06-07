"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markIstatSubmittedAction } from "./actions";

/** Segna (o aggiorna) l'avvenuto invio ISTAT del mese; mostra la data se già inviato. */
export function IstatSubmitButton({
  period,
  submittedLabel,
  disabled,
}: {
  period: string;
  submittedLabel: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const res = await markIstatSubmittedAction(period);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {submittedLabel && (
        <span className="text-success text-xs font-medium">Inviata il {submittedLabel}</span>
      )}
      <Button
        type="button"
        size="sm"
        variant={submittedLabel ? "outline" : "default"}
        onClick={onClick}
        disabled={disabled || pending}
      >
        {submittedLabel ? "Aggiorna invio" : "Segna come inviata"}
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

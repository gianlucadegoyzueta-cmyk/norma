"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reopenRejectedAction } from "@/app/schedine/actions";
import { Button } from "@/components/ui/button";

/**
 * Rimette in coda una schedina REJECTED (REJECTED → PENDING). Usabile sia in /schedine che nel
 * dettaglio soggiorno: al successo aggiorna la pagina corrente con router.refresh() (entrambe sono
 * Server Component dinamici), così la riga si aggiorna senza ricaricare a mano.
 */
export function ReopenRejectedButton({ schedinaId }: { schedinaId: string }) {
  const [state, action, pending] = useActionState(reopenRejectedAction, null);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (state?.ok && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [state, router]);

  return (
    <span className="inline-flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="schedinaId" value={schedinaId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Rimetto in coda…" : "Rimetti in coda"}
        </Button>
      </form>
      {state && !state.ok ? (
        <span role="alert" className="text-destructive text-xs">
          {state.message}
        </span>
      ) : null}
    </span>
  );
}

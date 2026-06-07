"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { reopenNeedsReviewAction } from "@/app/schedine/actions";
import { Button } from "@/components/ui/button";

/**
 * Rimette in coda una schedina NEEDS_REVIEW (→ PENDING, tentativi azzerati). Al successo aggiorna
 * la pagina con router.refresh() (la /schedine è un Server Component dinamico).
 */
export function ReopenNeedsReviewButton({ schedinaId }: { schedinaId: string }) {
  const [state, action, pending] = useActionState(reopenNeedsReviewAction, null);
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

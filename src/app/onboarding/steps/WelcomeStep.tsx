"use client";

import { useActionState, useEffect, useRef } from "react";
import { Brand } from "@/components/brand";
import { SubmitButton } from "@/components/ui/submit-button";
import { advanceFromWelcomeAction } from "../actions";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [state, action] = useActionState(advanceFromWelcomeAction, null);
  const advanced = useRef(false);
  useEffect(() => {
    if (state?.ok && !advanced.current) {
      advanced.current = true;
      onNext();
    }
  }, [state, onNext]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-7 text-center">
      <Brand />
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Mettiamo in regola la tua attività in pochi minuti
        </h1>
        <p className="text-muted-foreground text-pretty">
          Ti guidiamo passo passo: colleghi Alloggiati, aggiungi il primo immobile e sei pronto a
          inviare le schedine. Puoi fermarti e riprendere quando vuoi — salviamo tutto.
        </p>
      </div>
      <form action={action}>
        <SubmitButton size="lg" pendingLabel="Un attimo…">
          Inizia
        </SubmitButton>
      </form>
    </div>
  );
}

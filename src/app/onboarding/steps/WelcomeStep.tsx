"use client";

import { type CSSProperties, useActionState, useEffect, useRef } from "react";
import { Brand } from "@/components/brand";
import { FormMessage } from "@/components/ui/field";
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
      <span className="ob-reveal" style={{ "--ob-delay": "0ms" } as CSSProperties}>
        <Brand />
      </span>
      <div className="space-y-3">
        <p
          className="ob-reveal text-muted-foreground font-mono text-xs tracking-[0.16em] uppercase"
          style={{ "--ob-delay": "120ms" } as CSSProperties}
        >
          Ciao, sono Norma
        </p>
        <h1
          className="ob-reveal font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          style={{ "--ob-delay": "240ms" } as CSSProperties}
        >
          Mi occupo io della burocrazia
        </h1>
        <p
          className="ob-reveal text-muted-foreground text-pretty"
          style={{ "--ob-delay": "360ms" } as CSSProperties}
        >
          Schedine Alloggiati, tassa di soggiorno, ISTAT: le faccio al posto tuo. Tre domande e
          partiamo. Puoi fermarti quando vuoi —{" "}
          <strong className="text-foreground">salvo tutto</strong> e riprendiamo da dove eravamo.
        </p>
      </div>
      <form
        action={action}
        className="ob-reveal flex flex-col items-center gap-3"
        style={{ "--ob-delay": "480ms" } as CSSProperties}
      >
        {state && !state.ok ? <FormMessage>{state.message}</FormMessage> : null}
        <SubmitButton size="lg" pendingLabel="Un attimo…">
          Partiamo
        </SubmitButton>
      </form>
    </div>
  );
}

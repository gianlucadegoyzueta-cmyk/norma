"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { finishOnboardingAction } from "../actions";

export function ReadyStep({ onBack }: { onBack: () => void }) {
  // finishOnboardingAction esegue un redirect: non serve gestire l'esito qui.
  const [, action] = useActionState(finishOnboardingAction, null);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-7 text-center">
      <span
        aria-hidden
        className="bg-success/12 text-success flex size-14 items-center justify-center rounded-full text-2xl"
      >
        ✓
      </span>
      <div className="space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Sei pronto a inviare le schedine
        </h2>
        <p className="text-muted-foreground text-pretty">
          Credenziale collegata, tabelle pronte e primo immobile registrato. Da qui crei un
          soggiorno con i suoi ospiti e generi le schedine per Alloggiati.
        </p>
      </div>

      <div className="grid w-full gap-2">
        <form action={action}>
          <input type="hidden" name="target" value="stays" />
          <SubmitButton size="lg" className="w-full" pendingLabel="Apro i soggiorni…">
            Crea il primo soggiorno
          </SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="target" value="dashboard" />
          <SubmitButton variant="outline" className="w-full" pendingLabel="Apro la dashboard…">
            Vai alla dashboard
          </SubmitButton>
        </form>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        Indietro
      </Button>
    </div>
  );
}

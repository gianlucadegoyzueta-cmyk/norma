"use client";

import { useActionState } from "react";
import { CalendarPlus, LayoutDashboard, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { finishOnboardingAction } from "../actions";

/**
 * Step finale. L'host ha già il primo immobile: da qui lo porto nel funnel dati-in, che è la
 * keystone di tutto (calendario → prenotazioni → check-in → schedine/ISTAT). L'azione principale
 * è collegare il calendario dell'immobile (import automatico delle prenotazioni); in alternativa
 * un soggiorno a mano o la dashboard. Niente vicoli ciechi: ogni scelta è una server action gated.
 */
export function ReadyStep({ onBack }: { onBack: () => void }) {
  // finishOnboardingAction esegue un redirect: non serve gestire l'esito qui.
  const [, action] = useActionState(finishOnboardingAction, null);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-7 text-center">
      <span
        aria-hidden
        className="ob-stamp bg-success/12 text-success flex size-14 items-center justify-center rounded-full text-2xl"
      >
        ✓
      </span>
      <div className="space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
          Ci penso io, da qui
        </h2>
        <p className="text-muted-foreground text-pretty">
          Canale aperto, tabelle pronte, primo immobile registrato. Ora collega il calendario:
          importo le prenotazioni da solo e, a ogni ospite, preparo le schedine per Alloggiati e i
          dati per la tassa di soggiorno. Tu{" "}
          <strong className="text-foreground">confermi con un click</strong>.
        </p>
      </div>

      <div className="grid w-full gap-2">
        {/* Azione principale: collegare il calendario dell'immobile = funnel dati-in automatico. */}
        <form action={action}>
          <input type="hidden" name="target" value="properties" />
          <SubmitButton size="lg" className="w-full" pendingLabel="Apro l'immobile…">
            <Link2 aria-hidden />
            Collega il calendario
          </SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="target" value="stays" />
          <SubmitButton variant="outline" className="w-full" pendingLabel="Apro i soggiorni…">
            <CalendarPlus aria-hidden />
            Aggiungi un soggiorno a mano
          </SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="target" value="dashboard" />
          <SubmitButton variant="ghost" className="w-full" pendingLabel="Apro la dashboard…">
            <LayoutDashboard aria-hidden />
            Vai alla dashboard
          </SubmitButton>
        </form>
      </div>

      <p className="text-muted-foreground text-xs text-pretty">
        Puoi fare tutto più tardi: trovi ogni cosa in dashboard.
      </p>

      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        Indietro
      </Button>
    </div>
  );
}

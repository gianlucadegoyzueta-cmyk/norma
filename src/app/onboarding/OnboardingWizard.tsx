"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Brand } from "@/components/brand";
import { Stepper } from "./_components/Stepper";
import { startStepTransition } from "./_lib/view-transition";
import { setStepAction } from "./actions";
import { ActivityStep } from "./steps/ActivityStep";
import { ConnectAlloggiatiStep } from "./steps/ConnectAlloggiatiStep";
import { FirstPropertyStep } from "./steps/FirstPropertyStep";
import { ReadyStep } from "./steps/ReadyStep";
import { WelcomeStep } from "./steps/WelcomeStep";

interface Credential {
  id: string;
  label: string;
  provincia: string;
}
interface Comune {
  id: string;
  name: string;
  provincia: string;
}

/**
 * Orchestratore del wizard: gestisce lo step corrente con transizioni fluide (View Transitions) e
 * autosave della navigazione. I DATI di ogni step sono persistiti dalle rispettive server action,
 * quindi al refresh il server ricalcola lo step (ripresa dallo stesso punto). Niente vicoli ciechi:
 * "Esci" porta in dashboard e si può rientrare.
 */
export function OnboardingWizard({
  initialStep,
  user,
  organizationName,
  progress,
  credentials,
  comuni,
}: {
  initialStep: number;
  user: { name: string | null; email: string | null };
  organizationName: string;
  progress: { userType: string | null; structuresCount: number | null };
  credentials: Credential[];
  comuni: Comune[];
}) {
  const [step, setStep] = useState(initialStep);

  const go = useCallback((n: number) => {
    startStepTransition(() => setStep(n));
    void setStepAction(n); // autosave navigazione (best-effort)
  }, []);

  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* Stessa "carta" della superficie auth: grana + sigillo in filigrana, theme-safe. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.5] mix-blend-multiply"
      >
        <filter id="ob-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.13 0 0 0 0 0.11 0 0 0 0 0.08 0 0 0 0.04 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#ob-grain)" />
      </svg>
      <div
        aria-hidden
        className="text-foreground pointer-events-none absolute top-[18%] left-1/2 -z-10 -translate-x-1/2 opacity-[0.035]"
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="size-[420px]"
        >
          <circle cx="100" cy="100" r="96" />
          <circle cx="100" cy="100" r="88" strokeDasharray="1 3" />
          <circle cx="100" cy="100" r="78" strokeDasharray="6 4" />
          <circle cx="100" cy="100" r="66" strokeDasharray="1 2" />
          <circle cx="100" cy="100" r="55" />
          <circle cx="100" cy="100" r="44" strokeDasharray="8 3" />
          <circle cx="100" cy="100" r="34" strokeDasharray="1 5" />
          <circle cx="100" cy="100" r="24" strokeDasharray="1 5" />
        </svg>
      </div>

      <header className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <Brand />
        {/* Stepper visibile fin dal Benvenuto: si vede subito che è un percorso guidato. */}
        <Stepper current={step} />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            title="Il progresso è già salvato per ogni passo: puoi riprendere quando vuoi."
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1 text-sm transition-colors outline-none focus-visible:ring-2"
          >
            Salva ed esci
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        {/* key={step}: rimonta la scena a ogni passo → l'animazione d'ingresso si rigioca. */}
        <div key={step} className="ob-scene flex w-full justify-center">
          {step === 0 && <WelcomeStep onNext={() => go(1)} />}
          {step === 1 && (
            <ActivityStep
              onNext={() => go(2)}
              onBack={() => go(0)}
              defaults={{
                name: user.name,
                organizationName,
                userType: progress.userType,
                structuresCount: progress.structuresCount,
              }}
            />
          )}
          {step === 2 && <ConnectAlloggiatiStep onNext={() => go(3)} onBack={() => go(1)} />}
          {step === 3 && (
            <FirstPropertyStep
              onNext={() => go(4)}
              onBack={() => go(2)}
              credentials={credentials}
              comuni={comuni}
            />
          )}
          {step === 4 && <ReadyStep onBack={() => go(3)} />}
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <main className="flex min-h-dvh flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <Brand />
        {step > 0 ? <Stepper current={step} /> : <span aria-hidden />}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1 text-sm transition-colors outline-none focus-visible:ring-2"
          >
            Esci
          </Link>
          <ThemeToggle />
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

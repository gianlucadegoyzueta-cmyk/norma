import type { PrismaClient } from "@prisma/client";
import { PrismaReferenceTableRepository, checkReferenceTablesHealth } from "../alloggiati";

/**
 * Stato di onboarding di un'organizzazione, calcolato dai dati reali (niente flag persistiti:
 * lo stato è DERIVATO, quindi sempre coerente e idempotente). Ogni passo è "fatto" quando la
 * condizione corrispondente è soddisfatta. L'ordine riflette le dipendenze del flusso:
 *   credenziale ATTIVA → tabelle sincronizzate → primo immobile → primo soggiorno.
 */
export type OnboardingStepKey = "credential" | "reference" | "property" | "stay";

export interface OnboardingStep {
  key: OnboardingStepKey;
  done: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  /** true quando tutti i passi sono completati. */
  ready: boolean;
  /** Primo passo non ancora completato (per il CTA "continua"), o null se finito. */
  nextStep: OnboardingStepKey | null;
}

export async function getOnboardingState(
  prisma: PrismaClient,
  organizationId: string,
): Promise<OnboardingState> {
  // Letture minime in parallelo: contatori + health delle tabelle di riferimento.
  const [activeCredential, propertyCount, stayCount, health] = await Promise.all([
    prisma.alloggiatiCredential.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.property.count({ where: { organizationId } }),
    prisma.stay.count({ where: { organizationId } }),
    checkReferenceTablesHealth(new PrismaReferenceTableRepository(prisma)),
  ]);

  const steps: OnboardingStep[] = [
    { key: "credential", done: activeCredential > 0 },
    { key: "reference", done: health.ready },
    { key: "property", done: propertyCount > 0 },
    { key: "stay", done: stayCount > 0 },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done)?.key ?? null;

  return {
    steps,
    completed,
    total: steps.length,
    ready: completed === steps.length,
    nextStep,
  };
}

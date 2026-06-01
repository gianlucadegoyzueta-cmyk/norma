import type { OnboardingProgress, OnboardingUserType, PrismaClient } from "@prisma/client";

/**
 * Stato del WIZARD di onboarding. I passi "soft" (benvenuto, attività) vivono in OnboardingProgress;
 * i passi "duri" (credenziale ATTIVA + tabelle, immobile) restano DERIVATI da getOnboardingState e
 * NON si duplicano qui. Questo modulo unisce le due fonti per decidere quale step mostrare.
 *
 * NB: la tabella di riferimento ("reference") è volutamente FUSA nello step Alloggiati: l'utente non
 * la vede come passo separato (la sync è automatica e invisibile dopo la verifica della credenziale).
 */

/** Step del wizard, in ordine. */
export const WIZARD_STEP_KEYS = ["welcome", "activity", "alloggiati", "property", "ready"] as const;
export type WizardStepKey = (typeof WIZARD_STEP_KEYS)[number];
export type WizardStepIndex = 0 | 1 | 2 | 3 | 4;

/** Forma minima dello stato di dominio (da getOnboardingState), per restare disaccoppiati/testabili. */
export interface OnboardingStateLike {
  steps: ReadonlyArray<{ key: string; done: boolean }>;
}

/** Forma minima del progress soft, per restare disaccoppiati/testabili. */
export interface ProgressLike {
  welcomedAt: Date | null;
  identityDoneAt: Date | null;
}

export interface WizardStatus {
  welcomeDone: boolean;
  activityDone: boolean;
  /** Credenziale ATTIVA E tabelle di riferimento pronte (i due passi "duri" dello step Alloggiati). */
  alloggiatiDone: boolean;
  propertyDone: boolean;
  /** Tutto pronto: si può chiudere il wizard. */
  allDone: boolean;
}

function domainDone(state: OnboardingStateLike, key: string): boolean {
  return state.steps.find((s) => s.key === key)?.done ?? false;
}

export function deriveWizardStatus(
  progress: ProgressLike | null,
  state: OnboardingStateLike,
): WizardStatus {
  const welcomeDone = Boolean(progress?.welcomedAt);
  const activityDone = Boolean(progress?.identityDoneAt);
  // "reference" (tabelle) è fusa nello step Alloggiati: serve credenziale ATTIVA + tabelle pronte.
  const alloggiatiDone = domainDone(state, "credential") && domainDone(state, "reference");
  const propertyDone = domainDone(state, "property");
  return {
    welcomeDone,
    activityDone,
    alloggiatiDone,
    propertyDone,
    allDone: welcomeDone && activityDone && alloggiatiDone && propertyDone,
  };
}

/**
 * Step su cui far atterrare il wizard alla (ri)apertura: il PRIMO non completato, così l'utente
 * riprende esattamente dove deve ancora agire (refresh-safe). Da lì la navigazione è libera.
 */
export function computeCurrentStep(
  progress: ProgressLike | null,
  state: OnboardingStateLike,
): WizardStepIndex {
  const s = deriveWizardStatus(progress, state);
  if (!s.welcomeDone) return 0;
  if (!s.activityDone) return 1;
  if (!s.alloggiatiDone) return 2;
  if (!s.propertyDone) return 3;
  return 4;
}

// ----------------------- Persistenza (Prisma) -----------------------

/** Campi aggiornabili del progress (sottoinsieme sicuro, niente id/timestamps). */
export interface ProgressInput {
  userType?: OnboardingUserType | null;
  structuresCount?: number | null;
  welcomedAt?: Date | null;
  identityDoneAt?: Date | null;
  currentStep?: number;
  completedAt?: Date | null;
}

export function loadProgress(
  prisma: PrismaClient,
  organizationId: string,
): Promise<OnboardingProgress | null> {
  return prisma.onboardingProgress.findUnique({ where: { organizationId } });
}

/** Upsert idempotente del progress dell'org (1:1). */
export function upsertProgress(
  prisma: PrismaClient,
  organizationId: string,
  data: ProgressInput,
): Promise<OnboardingProgress> {
  return prisma.onboardingProgress.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  });
}

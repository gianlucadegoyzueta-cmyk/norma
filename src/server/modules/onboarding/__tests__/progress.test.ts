import { describe, expect, it } from "vitest";
import {
  computeCurrentStep,
  deriveWizardStatus,
  type OnboardingStateLike,
  type ProgressLike,
} from "../progress";

const now = new Date();

function state(done: Partial<Record<string, boolean>>): OnboardingStateLike {
  return {
    steps: [
      { key: "credential", done: done.credential ?? false },
      { key: "reference", done: done.reference ?? false },
      { key: "property", done: done.property ?? false },
      { key: "stay", done: done.stay ?? false },
    ],
  };
}

const noProgress: ProgressLike = { welcomedAt: null, identityDoneAt: null };
const welcomed: ProgressLike = { welcomedAt: now, identityDoneAt: null };
const identity: ProgressLike = { welcomedAt: now, identityDoneAt: now };

describe("computeCurrentStep", () => {
  it("nessun progresso → step 0 (benvenuto)", () => {
    expect(computeCurrentStep(noProgress, state({}))).toBe(0);
    expect(computeCurrentStep(null, state({}))).toBe(0);
  });
  it("benvenuto visto ma identità non fatta → step 1", () => {
    expect(computeCurrentStep(welcomed, state({}))).toBe(1);
  });
  it("identità fatta, credenziale non attiva → step 2 (Alloggiati)", () => {
    expect(computeCurrentStep(identity, state({}))).toBe(2);
  });
  it("credenziale attiva ma tabelle non pronte → resta step 2 (la sync è inclusa)", () => {
    expect(computeCurrentStep(identity, state({ credential: true, reference: false }))).toBe(2);
  });
  it("Alloggiati ok (cred + tabelle) ma nessun immobile → step 3", () => {
    expect(computeCurrentStep(identity, state({ credential: true, reference: true }))).toBe(3);
  });
  it("tutto pronto → step 4", () => {
    expect(
      computeCurrentStep(identity, state({ credential: true, reference: true, property: true })),
    ).toBe(4);
  });
});

describe("deriveWizardStatus", () => {
  it("alloggiatiDone richiede credenziale ATTIVA E tabelle pronte", () => {
    expect(
      deriveWizardStatus(identity, state({ credential: true, reference: false })).alloggiatiDone,
    ).toBe(false);
    expect(
      deriveWizardStatus(identity, state({ credential: true, reference: true })).alloggiatiDone,
    ).toBe(true);
  });
  it("allDone solo quando tutti i passi (soft + duri) sono completi", () => {
    expect(
      deriveWizardStatus(identity, state({ credential: true, reference: true, property: true }))
        .allDone,
    ).toBe(true);
    expect(
      deriveWizardStatus(welcomed, state({ credential: true, reference: true, property: true }))
        .allDone,
    ).toBe(false);
  });
});

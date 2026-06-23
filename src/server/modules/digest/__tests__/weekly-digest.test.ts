import { describe, expect, it } from "vitest";
import {
  composeWeeklyDigestEmail,
  isRegularPosition,
  type WeeklyDigestData,
} from "../domain/weekly-digest";

function data(overrides: Partial<WeeklyDigestData> = {}): WeeklyDigestData {
  return {
    orgName: "Casa Aurora",
    weekStartIso: "2026-06-01",
    weekEndIso: "2026-06-07",
    done: { schedineAcquired: 3, checkinsCompleted: 2, staysAdded: 1, taxDeclared: 0 },
    upcoming: { schedinePending: 1, arrivalsNext7Days: 2, checkinsAwaiting: 1 },
    position: { overdue: 0, needsReview: 0 },
    ...overrides,
  };
}

describe("isRegularPosition", () => {
  it("regolare solo se nessuna schedina scaduta né da rivedere", () => {
    expect(isRegularPosition({ overdue: 0, needsReview: 0 })).toBe(true);
    expect(isRegularPosition({ overdue: 1, needsReview: 0 })).toBe(false);
    expect(isRegularPosition({ overdue: 0, needsReview: 2 })).toBe(false);
  });
});

describe("composeWeeklyDigestEmail", () => {
  it("posizione regolare: subject e corpo lo dicono", () => {
    const { subject, text } = composeWeeklyDigestEmail(data());
    expect(subject).toContain("tutto in regola");
    expect(text).toContain("Posizione: REGOLARE");
    expect(text).toContain("Casa Aurora");
  });

  it("conteggi al singolare/plurale e sezioni vuote omesse", () => {
    const { text } = composeWeeklyDigestEmail(
      data({
        done: { schedineAcquired: 1, checkinsCompleted: 0, staysAdded: 0, taxDeclared: 0 },
        upcoming: { schedinePending: 0, arrivalsNext7Days: 0, checkinsAwaiting: 0 },
      }),
    );
    expect(text).toContain("1 schedina acquisita dalla Questura");
    // niente righe a zero
    expect(text).not.toContain("0 ");
    // nessuna pendenza → messaggio "a posto"
    expect(text).toContain("niente in sospeso");
  });

  it("settimana senza attività: messaggio dedicato, non liste di zeri", () => {
    const { text } = composeWeeklyDigestEmail(
      data({
        done: { schedineAcquired: 0, checkinsCompleted: 0, staysAdded: 0, taxDeclared: 0 },
      }),
    );
    expect(text).toContain("non ha registrato attività");
  });

  it("posizione da sistemare: subject e dettaglio delle pendenze", () => {
    const { subject, text } = composeWeeklyDigestEmail(
      data({ position: { overdue: 2, needsReview: 1 } }),
    );
    expect(subject).toContain("qualcosa da sistemare");
    expect(text).toContain("Posizione: DA SISTEMARE");
    expect(text).toContain("2 schedine sono oltre la scadenza");
    expect(text).toContain("1 schedina richiede");
  });
});

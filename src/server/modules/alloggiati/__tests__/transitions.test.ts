import { SchedinaStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  assertValidTransition,
  decideFromSendAttempt,
  isTerminal,
  isValidTransition,
} from "../domain/transitions";

const { PENDING, SENDING, ACQUIRED, REJECTED, UNVERIFIED } = SchedinaStatus;

describe("transizioni di stato dell'outbox — valide", () => {
  it("percorso felice: PENDING → SENDING → ACQUIRED", () => {
    expect(isValidTransition(PENDING, SENDING)).toBe(true);
    expect(isValidTransition(SENDING, ACQUIRED)).toBe(true);
  });

  it("dall'invio si può anche finire REJECTED o UNVERIFIED", () => {
    expect(isValidTransition(SENDING, REJECTED)).toBe(true);
    expect(isValidTransition(SENDING, UNVERIFIED)).toBe(true);
  });

  it("recupero: REJECTED → PENDING; UNVERIFIED → {ACQUIRED, PENDING}", () => {
    expect(isValidTransition(REJECTED, PENDING)).toBe(true);
    expect(isValidTransition(UNVERIFIED, ACQUIRED)).toBe(true);
    expect(isValidTransition(UNVERIFIED, PENDING)).toBe(true);
  });

  it("parcheggio: PENDING → NEEDS_REVIEW; rimessa in coda: NEEDS_REVIEW → PENDING", () => {
    expect(isValidTransition(PENDING, SchedinaStatus.NEEDS_REVIEW)).toBe(true);
    expect(isValidTransition(SchedinaStatus.NEEDS_REVIEW, PENDING)).toBe(true);
  });
});

describe("transizioni di stato dell'outbox — invalide", () => {
  it("ACQUIRED è terminale (irreversibile)", () => {
    expect(isTerminal(ACQUIRED)).toBe(true);
    expect(isValidTransition(ACQUIRED, PENDING)).toBe(false);
    expect(isValidTransition(ACQUIRED, SENDING)).toBe(false);
    expect(isValidTransition(ACQUIRED, REJECTED)).toBe(false);
  });

  it("non si salta lo stato SENDING", () => {
    expect(isValidTransition(PENDING, ACQUIRED)).toBe(false);
    expect(isValidTransition(PENDING, REJECTED)).toBe(false);
    expect(isValidTransition(PENDING, UNVERIFIED)).toBe(false);
  });

  it("da SENDING non si torna a PENDING direttamente", () => {
    expect(isValidTransition(SENDING, PENDING)).toBe(false);
  });

  it("NEEDS_REVIEW esce SOLO verso PENDING; non vi si salta da SENDING", () => {
    const { NEEDS_REVIEW } = SchedinaStatus;
    expect(isValidTransition(NEEDS_REVIEW, SENDING)).toBe(false);
    expect(isValidTransition(NEEDS_REVIEW, ACQUIRED)).toBe(false);
    expect(isValidTransition(NEEDS_REVIEW, REJECTED)).toBe(false);
    expect(isValidTransition(SENDING, NEEDS_REVIEW)).toBe(false);
  });

  it("assertValidTransition lancia InvalidTransitionError sulle transizioni illegali", () => {
    expect(() => assertValidTransition(ACQUIRED, PENDING)).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition(PENDING, ACQUIRED)).toThrow(InvalidTransitionError);
    // non deve lanciare su una transizione valida:
    expect(() => assertValidTransition(PENDING, SENDING)).not.toThrow();
  });
});

describe("decideFromSendAttempt", () => {
  it("ACQUIRED → stato ACQUIRED, senza errori", () => {
    const d = decideFromSendAttempt({ kind: "ACQUIRED" });
    expect(d).toEqual({ status: ACQUIRED, errorCod: null, errorDes: null });
  });

  it("REJECTED → stato REJECTED, con codice/descrizione errore", () => {
    const d = decideFromSendAttempt({
      kind: "REJECTED",
      errorCod: "12",
      errorDes: "Data di Arrivo Errata",
    });
    expect(d).toEqual({ status: REJECTED, errorCod: "12", errorDes: "Data di Arrivo Errata" });
  });

  it("NO_RESPONSE (timeout) → stato UNVERIFIED", () => {
    expect(decideFromSendAttempt({ kind: "NO_RESPONSE" }).status).toBe(UNVERIFIED);
  });
});

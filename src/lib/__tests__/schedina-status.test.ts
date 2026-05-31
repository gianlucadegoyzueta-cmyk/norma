import { describe, expect, it } from "vitest";
import { isOpenStatus, isOverdue, OPEN_SCHEDINA_STATUSES } from "../schedina-status";

const past = new Date(Date.now() - 60_000);
const future = new Date(Date.now() + 60_000);

describe("isOpenStatus / OPEN_SCHEDINA_STATUSES", () => {
  it("considera aperte solo PENDING / SENDING / UNVERIFIED", () => {
    expect(OPEN_SCHEDINA_STATUSES).toEqual(["PENDING", "SENDING", "UNVERIFIED"]);
    expect(isOpenStatus("PENDING")).toBe(true);
    expect(isOpenStatus("SENDING")).toBe(true);
    expect(isOpenStatus("UNVERIFIED")).toBe(true);
    expect(isOpenStatus("ACQUIRED")).toBe(false);
    expect(isOpenStatus("REJECTED")).toBe(false);
  });
});

describe("isOverdue", () => {
  it("aperta + deadline passata → overdue", () => {
    expect(isOverdue({ status: "PENDING", deadlineAt: past })).toBe(true);
    expect(isOverdue({ status: "UNVERIFIED", deadlineAt: past })).toBe(true);
  });
  it("aperta + deadline futura → non overdue", () => {
    expect(isOverdue({ status: "PENDING", deadlineAt: future })).toBe(false);
  });
  it("ACQUIRED/REJECTED non sono mai overdue (anche se scadute)", () => {
    expect(isOverdue({ status: "ACQUIRED", deadlineAt: past })).toBe(false);
    expect(isOverdue({ status: "REJECTED", deadlineAt: past })).toBe(false);
  });
});

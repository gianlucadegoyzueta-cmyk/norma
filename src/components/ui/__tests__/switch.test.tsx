// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "../switch";

afterEach(cleanup);

describe("Switch", () => {
  it("espone role=switch con aria-checked coerente", () => {
    render(<Switch checked={true} onCheckedChange={() => {}} aria-label="Test" />);
    const el = screen.getByRole("switch", { name: "Test" });
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("al click invoca onCheckedChange col valore invertito", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} aria-label="Test" />);
    await user.click(screen.getByRole("switch", { name: "Test" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disabilitato non invoca il callback", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} disabled aria-label="Test" />);
    await user.click(screen.getByRole("switch", { name: "Test" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

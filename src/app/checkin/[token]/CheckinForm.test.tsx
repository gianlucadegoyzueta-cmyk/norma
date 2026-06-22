// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MESSAGES } from "@/server/modules/checkin/messages";
import type { CheckinSubmitState } from "./actions";

// La server action è mockata: il test verifica il COMPORTAMENTO CLIENT (transizione successo →
// "Aggiungi un'altra persona" → form pulito), non la logica server. Il mock restituisce sempre ok.
const submitMock = vi.fn(async (): Promise<CheckinSubmitState> => ({ ok: true }));
vi.mock("./actions", () => ({
  submitCheckinAction: (...args: unknown[]) => submitMock(...(args as [])),
}));

import { CheckinForm } from "./CheckinForm";

const m = MESSAGES.it;

function renderForm() {
  return render(
    <CheckinForm
      token="tok-test"
      locale="it"
      m={m}
      countries={[{ id: "c1", name: "Italia" }]}
      comuni={[{ id: "m1", label: "Roma" }]}
      luoghi={[{ id: "l1", label: "Roma" }]}
      documentTypes={[{ id: "d1", name: "Passaporto" }]}
    />,
  );
}

describe("CheckinForm — flusso multi-ospite", () => {
  afterEach(() => {
    cleanup();
    submitMock.mockClear();
  });

  it("dopo un submit ok e il click su 'Aggiungi un'altra persona' il form torna visibile e pulito", async () => {
    const user = userEvent.setup();
    renderForm();

    // Compila un campo identificabile, così poi possiamo verificare che venga azzerato.
    const lastName = screen.getByLabelText(m.lastName) as HTMLInputElement;
    await user.type(lastName, "Rossi");
    expect(lastName.value).toBe("Rossi");

    // Submit del form: usiamo fireEvent.submit (non il click sul bottone) per non dipendere dalla
    // validazione HTML5 dei campi `required`, che jsdom blocca silenziosamente. Qui ci interessa il
    // path di useActionState: l'action mockata ritorna { ok: true } → compare la Card di successo.
    const form = lastName.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(m.successTitle)).toBeTruthy();
    });
    expect(submitMock).toHaveBeenCalledTimes(1);
    // Il form non è più montato.
    expect(screen.queryByLabelText(m.lastName)).toBeNull();

    // Click su "Aggiungi un'altra persona": il form deve RICOMPARIRE (regressione del no-op).
    await user.click(screen.getByRole("button", { name: m.addAnother }));

    await waitFor(() => {
      expect(screen.getByLabelText(m.lastName)).toBeTruthy();
    });
    // La conferma è sparita e il campo è di nuovo vuoto (form rimontato pulito).
    expect(screen.queryByText(m.successTitle)).toBeNull();
    expect((screen.getByLabelText(m.lastName) as HTMLInputElement).value).toBe("");
  });
});

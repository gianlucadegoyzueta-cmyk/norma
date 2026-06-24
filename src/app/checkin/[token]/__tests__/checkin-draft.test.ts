// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearDraft, loadDraft, saveDraft } from "../checkin-draft";

afterEach(() => localStorage.clear());

/** Costruisce un <form> con i campi dati. */
function makeForm(fields: Record<string, string>): HTMLFormElement {
  const form = document.createElement("form");
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}

describe("checkin-draft", () => {
  it("salva i campi non vuoti, escludendo token e lang", () => {
    const form = makeForm({
      token: "abc",
      lang: "it",
      lastName: "Rossi",
      firstName: "Mario",
      documentNumber: "",
    });
    saveDraft("tok1", form);

    expect(loadDraft("tok1")).toEqual({ lastName: "Rossi", firstName: "Mario" });
  });

  it("se non c'è nulla da salvare rimuove la bozza", () => {
    localStorage.setItem("norma:checkin-draft:tok2", JSON.stringify({ lastName: "X" }));
    saveDraft("tok2", makeForm({ token: "abc", lang: "it" }));
    expect(loadDraft("tok2")).toBeNull();
  });

  it("loadDraft ritorna null se assente o corrotto", () => {
    expect(loadDraft("missing")).toBeNull();
    localStorage.setItem("norma:checkin-draft:bad", "{non-json");
    expect(loadDraft("bad")).toBeNull();
  });

  it("clearDraft rimuove la bozza", () => {
    saveDraft("tok3", makeForm({ lastName: "Verdi" }));
    expect(loadDraft("tok3")).not.toBeNull();
    clearDraft("tok3");
    expect(loadDraft("tok3")).toBeNull();
  });

  it("le bozze sono isolate per token", () => {
    saveDraft("A", makeForm({ lastName: "Uno" }));
    saveDraft("B", makeForm({ lastName: "Due" }));
    expect(loadDraft("A")).toEqual({ lastName: "Uno" });
    expect(loadDraft("B")).toEqual({ lastName: "Due" });
  });
});

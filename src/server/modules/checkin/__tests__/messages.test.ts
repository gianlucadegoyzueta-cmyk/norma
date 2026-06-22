import { describe, expect, it } from "vitest";
import type { PersonErrorCode } from "@/app/stays/guest-validation";
import { DEFAULT_LOCALE, isLocale, LOCALES, MESSAGES } from "../messages";

// Tutti i codici di errore prodotti da validatePerson: ogni lingua DEVE coprirli, altrimenti un
// ospite straniero vedrebbe un errore vuoto/undefined nel punto di conversione.
const ERROR_CODES: PersonErrorCode[] = [
  "lastNameRequired",
  "firstNameRequired",
  "sexRequired",
  "birthDateInvalid",
  "birthCountryRequired",
  "citizenshipRequired",
  "documentTypeRequired",
  "documentNumberRequired",
  "documentPlaceRequired",
];

describe("MESSAGES (i18n check-in)", () => {
  it("ogni lingua definisce le stesse chiavi di livello superiore (niente traduzioni mancanti)", () => {
    const reference = Object.keys(MESSAGES[DEFAULT_LOCALE]).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(MESSAGES[locale]).sort(), `chiavi mancanti in ${locale}`).toEqual(
        reference,
      );
    }
  });

  it("ogni lingua copre tutti i codici di errore per-campo con stringa non vuota", () => {
    for (const locale of LOCALES) {
      for (const code of ERROR_CODES) {
        const label = MESSAGES[locale].fieldErrors[code];
        expect(label, `${locale}.fieldErrors.${code}`).toBeTruthy();
        expect(typeof label).toBe("string");
      }
    }
  });

  it("nessun valore stringa vuoto nelle traduzioni di superficie", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        if (typeof value === "string") {
          expect(value.trim(), `${locale}.${key} non deve essere vuoto`).not.toBe("");
        }
      }
    }
  });

  it("isLocale riconosce solo le lingue supportate", () => {
    expect(isLocale("it")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zz")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

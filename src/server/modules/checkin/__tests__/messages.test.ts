import { describe, expect, it } from "vitest";
import type { PersonErrorCode } from "@/app/stays/guest-validation";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  MESSAGES,
  TOURISM_TYPE_CODES,
  TRANSPORT_MEANS_CODES,
} from "../messages";

// Tutti i codici di errore prodotti da validatePerson: ogni lingua DEVE coprirli, altrimenti un
// ospite straniero vedrebbe un errore vuoto/undefined nel punto di conversione. Derivati dal locale
// di default così l'aggiunta di un nuovo codice impone subito la traduzione in tutte le lingue.
const ERROR_CODES = Object.keys(MESSAGES[DEFAULT_LOCALE].fieldErrors) as PersonErrorCode[];

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

  it("ogni lingua traduce tutte le opzioni delle tendine viaggio (turismo + trasporto)", () => {
    for (const locale of LOCALES) {
      for (const code of TOURISM_TYPE_CODES) {
        const label = MESSAGES[locale].tourismTypes[code];
        expect(label, `${locale}.tourismTypes.${code}`).toBeTruthy();
        expect(typeof label).toBe("string");
      }
      for (const code of TRANSPORT_MEANS_CODES) {
        const label = MESSAGES[locale].transportMeans_options[code];
        expect(label, `${locale}.transportMeans_options.${code}`).toBeTruthy();
        expect(typeof label).toBe("string");
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

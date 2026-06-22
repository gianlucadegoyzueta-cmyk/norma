// Rendering del corpo email: testo semplice + HTML on-brand "Carta & Inchiostro".
// PURO, nessun I/O. Email-safe: table-based layout, stili inline, niente <style> esterni,
// niente JS, immagini opzionali. Responsive con max-width e width 100% sulle tabelle.
//
// Brand (hex esatti da src/app/globals.css):
//   avorio   #f7f2e8  (sfondo)        carta      #fbf9f3 (card)
//   inchiostro #211c15 (testo)        soft       #5b5347 (testo secondario)
//   terracotta #bc4b2b (CTA/primario) dark       #9e3d22 (bordo CTA)
//   hairline #e0d8c8 (linee)
// Font: Fraunces (display, con fallback serif) per il titolo; Geist/sans per il corpo.

import type { CheckinEmailStrings } from "./checkin-invite-content";

const BRAND = {
  avorio: "#f7f2e8",
  carta: "#fbf9f3",
  inchiostro: "#211c15",
  inchiostroSoft: "#5b5347",
  terracotta: "#bc4b2b",
  terracottaDark: "#9e3d22",
  hairline: "#e0d8c8",
} as const;

const FONT_DISPLAY = "Fraunces, 'Times New Roman', Georgia, serif";
const FONT_BODY =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Escape minimale dei caratteri pericolosi in contesto HTML (nome immobile fornito dall'host). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderHtmlInput {
  strings: CheckinEmailStrings;
  /** Già con `{property}` sostituito. */
  subject: string;
  /** Già con `{property}` sostituito. */
  body: string;
  /** URL pubblico di check-in (token in chiaro incluso). */
  checkinUrl: string;
  /** Lingua, usata per l'attributo lang del documento (accessibilità). */
  lang: string;
}

/**
 * Compone l'HTML completo dell'email. Tutto inline, table-based, accessibile:
 *  - `role="presentation"` sulle tabelle di layout (non sono dati tabellari);
 *  - contrasto alto (inchiostro su carta/avorio, avorio su terracotta);
 *  - link in chiaro come fallback del bottone;
 *  - `lang` sul tag radice.
 */
export function renderCheckinEmailHtml(input: RenderHtmlInput): string {
  const { strings, subject, body, checkinUrl, lang } = input;
  const safeUrl = escapeHtml(checkinUrl);

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.avorio}; color:${BRAND.inchiostro}; font-family:${FONT_BODY};">
    <!-- preheader nascosto: anteprima in inbox senza ripetere l'oggetto -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(body)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.avorio};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background-color:${BRAND.carta}; border:1px solid ${BRAND.hairline}; border-radius:12px;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0; font-family:${FONT_DISPLAY}; font-size:22px; line-height:1.3; font-weight:600; color:${BRAND.terracotta};">Norma</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 16px 0; font-family:${FONT_DISPLAY}; font-size:24px; line-height:1.3; font-weight:600; color:${BRAND.inchiostro};">${escapeHtml(subject)}</h1>
                <p style="margin:0 0 12px 0; font-size:16px; line-height:1.6; color:${BRAND.inchiostro};">${escapeHtml(strings.greeting)}</p>
                <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:${BRAND.inchiostro};">${escapeHtml(body)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:8px; background-color:${BRAND.terracotta};">
                      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:600; line-height:1; color:${BRAND.avorio}; text-decoration:none; border:1px solid ${BRAND.terracottaDark}; border-radius:8px;">${escapeHtml(strings.cta)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0 0 4px 0; font-size:13px; line-height:1.5; color:${BRAND.inchiostroSoft};">${escapeHtml(strings.linkLabel)}</p>
                <p style="margin:0; font-size:13px; line-height:1.5; word-break:break-all;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.terracotta}; text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px 32px;">
                <p style="margin:0; font-size:13px; line-height:1.5; color:${BRAND.inchiostroSoft};">${escapeHtml(strings.note)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px; border-top:1px solid ${BRAND.hairline};">
                <p style="margin:0 0 2px 0; font-size:13px; line-height:1.5; color:${BRAND.inchiostroSoft};">${escapeHtml(strings.footerSignature)}</p>
                <p style="margin:0; font-size:13px; line-height:1.5; color:${BRAND.inchiostroSoft};">${escapeHtml(strings.footerTagline)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

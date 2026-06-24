import { FileCheck2, Ban, ShieldCheck } from "lucide-react";

export interface ConciergeTrustProps {
  /** Riferimento dell'ultima Ricevuta della Questura archiviata (null = ancora nessuna). */
  receiptRef: string | null;
  /** Schedine acquisite di recente (finestra del diario): prova concreta del lavoro fatto. */
  acquiredRecently: number;
}

/**
 * Striscia "fiducia / fossato": rende VISIBILE ciò che differenzia Norma sui due pilastri —
 * non l'auto-invio (commodity, e congelato per guardrail #1), ma la PROVA che esegue in
 * sicurezza su mandato: Test prima dell'invio, riconciliazione T+1 con la ricevuta, "mai
 * inventare". Più la garanzia commerciale.
 *
 * Presentazionale: riceve solo dati già caricati dalla dashboard. NESSUNA promessa di invio
 * automatico. ⚠️ Il wording della garanzia è commerciale e va validato dal legale prima di
 * qualsiasi promessa pubblica (CLAUDE.md guardrail #1): qui è prudente e a massimale.
 */
export function ConciergeTrust({ receiptRef, acquiredRecently }: ConciergeTrustProps) {
  const points = [
    {
      Icon: ShieldCheck,
      text: "Verifico col Test prima di ogni invio: parte solo ciò che è valido.",
    },
    {
      Icon: FileCheck2,
      text: receiptRef
        ? `Riconciliazione T+1 sulla ricevuta della Questura · ${receiptRef}`
        : acquiredRecently > 0
          ? `Riconciliazione T+1 sulla ricevuta della Questura · ${acquiredRecently} acquisite di recente`
          : "Riconciliazione T+1 sulla ricevuta della Questura, per conteggio.",
    },
    {
      Icon: Ban,
      text: "Mai inventare: se un dato manca, non invio e ti dico esattamente cosa serve.",
    },
  ];

  return (
    <section
      aria-label="Come Norma lavora per te"
      className="rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: "var(--hairline)", background: "var(--carta)" }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-display text-base font-semibold" style={{ color: "var(--inchiostro)" }}>
          Norma esegue per te, su mandato.
        </p>
        <span className="text-[11px] tracking-[0.04em] uppercase" style={{ color: "var(--soft)" }}>
          la prova, non le promesse
        </span>
      </div>

      <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {points.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-2">
            <Icon
              className="mt-0.5 size-4 shrink-0"
              style={{ color: "var(--salvia)" }}
              aria-hidden
            />
            <span className="text-[13px] leading-snug" style={{ color: "var(--inchiostro)" }}>
              {text}
            </span>
          </li>
        ))}
      </ul>

      <p
        className="mt-3 border-t pt-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--hairline)", color: "var(--soft)" }}
      >
        <span style={{ color: "var(--inchiostro)", fontWeight: 600 }}>Garanzia.</span> Se un nostro
        errore tecnico ti causa una sanzione, la copriamo noi entro un massimale.{" "}
        <span className="opacity-70">Garanzia commerciale — dettagli in definizione.</span>
      </p>
    </section>
  );
}

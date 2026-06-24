import Link from "next/link";

/** Un mese nello strip di posizione a 12 mesi. */
export interface ComplianceMonth {
  /** Etichetta breve (es. "G", "F", "M" o "giu"). */
  label: string;
  /** regular = in regola, attention = pendenze, quiet = nessun movimento. */
  status: "regular" | "attention" | "quiet";
  /** Tooltip esteso (es. "Giugno · 12/12 schedine"). */
  title?: string;
}

/**
 * Pannello "Posizione · 12 mesi": uno strip compatto di celle colorate (verde/terracotta/neutro)
 * che dà a colpo d'occhio la storia di compliance. Riusa il concetto di /compliance (conteggi,
 * niente nominativi · vedi D3). Presentazionale.
 */
export function ConciergeCompliance({
  months,
  summary,
}: {
  months: ComplianceMonth[];
  summary: string;
}) {
  const regular = months.filter((m) => m.status === "regular").length;
  const tracked = months.filter((m) => m.status !== "quiet").length;
  return (
    <section className="cmx-panel" aria-labelledby="cmx-h-compliance">
      <div className="cmx-panel-h">
        <h2 id="cmx-h-compliance" className="cmx-panel-title">
          Posizione · 12 mesi
        </h2>
        <Link href="/compliance" className="cmx-panel-link">
          Storico <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="cmx-cal" role="img" aria-label={summary}>
        {months.map((m, i) => (
          <span key={i} className={`cmx-cal-cell cmx-cal-${m.status}`} title={m.title ?? m.label}>
            {m.label}
          </span>
        ))}
      </div>
      <p className="cmx-cal-note">
        <b>
          {regular}/{tracked || 12}
        </b>{" "}
        mesi in regola · {summary}
      </p>
    </section>
  );
}

import Link from "next/link";

/** Stato a colpo d'occhio di UNA struttura, per la lista "Le tue strutture" in dashboard. */
export interface PropertyStatus {
  id: string;
  name: string;
  city: string;
  /** Occupazione del mese (0–100), per la barra. */
  occupancyPct: number;
  /** Schedine in attesa di conferma per questa struttura. */
  pendingSchedine: number;
  /** Pallino di posizione: ok = in regola, wait = qualcosa da confermare, err = scaduto. */
  status: "ok" | "wait" | "err";
  /** Riga di contesto a destra quando non ci sono schedine in attesa (es. "prossimo arrivo VEN 13"). */
  nextLabel?: string;
}

/**
 * Pannello "Le tue strutture": una riga densa per immobile (posizione · occupazione · cosa
 * aspetta). Aggiunge sostanza alla dashboard senza inventare dati: tutto deriva da property,
 * stay e schedine già nel prodotto. Presentazionale.
 */
export function ConciergeProperties({ items }: { items: PropertyStatus[] }) {
  return (
    <section className="cmx-panel" aria-labelledby="cmx-h-strutture">
      <div className="cmx-panel-h">
        <h2 id="cmx-h-strutture" className="cmx-panel-title">
          Le tue strutture
        </h2>
        <Link href="/properties" className="cmx-panel-link">
          Tutte <span aria-hidden>→</span>
        </Link>
      </div>
      <ul className="cmx-prop-list">
        {items.map((p) => (
          <li key={p.id} className="cmx-prop-row">
            <span
              className={`cmx-statusdot cmx-status-${p.status}`}
              aria-hidden
              title={
                p.status === "ok" ? "in regola" : p.status === "wait" ? "in attesa" : "scaduto"
              }
            />
            <div className="cmx-prop-id">
              <Link href={`/properties/${p.id}`} className="cmx-prop-name">
                {p.name}
              </Link>
              <span className="cmx-prop-city">{p.city}</span>
            </div>
            <div className="cmx-prop-occ" title={`occupazione del mese: ${p.occupancyPct}%`}>
              <span className="cmx-occbar">
                <span
                  className="cmx-occfill"
                  style={{ width: `${Math.min(100, p.occupancyPct)}%` }}
                />
              </span>
              <span className="cmx-occnum">{p.occupancyPct}%</span>
            </div>
            <div className="cmx-prop-aside">
              {p.pendingSchedine > 0 ? (
                <span className="cmx-badge cmx-badge-wait">{p.pendingSchedine} da confermare</span>
              ) : (
                <span className="cmx-prop-next">{p.nextLabel ?? "in regola"}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

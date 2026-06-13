import { notFound } from "next/navigation";
import { ConciergePage } from "@/components/concierge/concierge-page";

// Anteprima visiva NON di produzione del guscio ConciergePage con contenuti di esempio
// (righe, badge, card, empty-state). Serve a screenshottare l'elevazione senza DB né login.
// 404 in produzione.
export const dynamic = "force-dynamic";

export default function PagesPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <ConciergePage
      kicker="OUTBOX · ALLOGGIATI WEB"
      title="Schedine"
      intro={
        <>
          L&apos;outbox degli invii ad Alloggiati di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>Demo · Anteprima</strong>. Ordinate per
          scadenza, le più urgenti in cima. L&apos;invio è{" "}
          <strong style={{ color: "var(--inchiostro)" }}>irreversibile</strong>.
        </>
      }
    >
      <div className="cmx-section flex flex-wrap gap-2" style={{ marginTop: 0 }}>
        <span className="cmx-badge cmx-badge-wait">3 da inviare</span>
        <span className="cmx-badge cmx-badge-ok">12 acquisite</span>
        <span className="cmx-badge cmx-badge-err">1 respinta</span>
        <span className="cmx-badge cmx-badge-err">1 oltre scadenza</span>
      </div>

      <section className="cmx-section">
        <h2 className="cmx-section-title">In coda</h2>
        <ul className="grid gap-2.5">
          {[
            {
              name: "Rossi Marco",
              meta: "Farnesina 11C · Roma · WSKey RM-034",
              badge: "Acquisita",
              cmx: "cmx-badge-ok",
              due: "entro 14/06 11:00",
            },
            {
              name: "Müller Hans",
              meta: "Carpe Diem · Roma · WSKey RM-034",
              badge: "Da inviare",
              cmx: "cmx-badge-wait",
              due: "entro 14/06 18:00",
            },
            {
              name: "Dubois Claire",
              meta: "Trastevere 4 · Roma · WSKey RM-034",
              badge: "Respinta",
              cmx: "cmx-badge-err",
              due: "scaduta 12/06 09:00",
            },
          ].map((r) => (
            <li key={r.name}>
              <div className="cmx-row">
                <div className="cmx-row-main">
                  <p className="cmx-row-title truncate">{r.name}</p>
                  <p className="cmx-row-meta truncate">{r.meta}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`cmx-badge ${r.cmx}`}>{r.badge}</span>
                  <span
                    className="text-xs"
                    style={{
                      color: r.due.startsWith("scaduta") ? "var(--terracotta-dark)" : "var(--soft)",
                      fontWeight: r.due.startsWith("scaduta") ? 600 : 400,
                    }}
                  >
                    {r.due}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="cmx-section">
        <h2 className="cmx-section-title">Stato vuoto</h2>
        <div className="cmx-empty">
          <p className="cmx-empty-title">Nessuna schedina, per ora</p>
          <p className="cmx-empty-text">
            Quando aggiungi un soggiorno, preparo qui le schedine pronte da confermare.
          </p>
        </div>
      </section>
    </ConciergePage>
  );
}

"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/** Una riga del riepilogo (drill-down) che si apre al click su un KPI. */
export interface KpiDetailRow {
  label: string;
  value: string;
}

/** Riepilogo di una cifra: come nasce + dove approfondire. */
export interface KpiDetail {
  title: string;
  intro?: string;
  rows: KpiDetailRow[];
  /** Nota esplicativa (es. come è stimata la cifra). */
  note?: string;
  /** Approfondimento verso una pagina reale del prodotto. */
  link?: { label: string; href: string };
}

export interface KpiSpec {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  trend: string;
  /** Trend in terracotta (scadenza/urgenza) invece che salvia. */
  due?: boolean;
  /** Riepilogo che si apre al click (drill-down). Se assente, il KPI non è cliccabile. */
  detail?: KpiDetail;
}

/** Altezza di una riga dell'odometro (deve combaciare con `.cmx-odo`/`.cmx-digit` nel CSS). */
const ROW = 44;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Odometro a rulli: per ogni cifra una colonna 0-9 che scorre alla cifra finale. */
function Odometer({ value, prefix, suffix }: { value: number; prefix?: string; suffix?: string }) {
  const digits = String(Math.max(0, Math.round(value))).split("");
  const [offsets, setOffsets] = useState<number[]>(() => digits.map(() => 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setOffsets(digits.map((d) => -ROW * Number(d)));
      return;
    }
    const timers = digits.map((d, idx) =>
      setTimeout(
        () => {
          setOffsets((prev) => {
            const next = [...prev];
            next[idx] = -ROW * Number(d);
            return next;
          });
        },
        1300 + idx * 140,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="cmx-odo">
      {prefix && <span className="cmx-pre">{prefix}</span>}
      {digits.map((_, idx) => (
        <span className="cmx-digit" key={idx} aria-hidden>
          <span className="cmx-col" style={{ transform: `translateY(${offsets[idx]}px)` }}>
            {Array.from({ length: 10 }, (_, k) => (
              <span key={k}>{k}</span>
            ))}
          </span>
        </span>
      ))}
      {suffix && <small>{suffix}</small>}
      {/* Valore accessibile (screen reader): l'odometro animato è puramente visivo. */}
      <span className="sr-only">
        {prefix}
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}

/** Tilt 3D + spotlight su mousemove (max 7-9°), degrada a niente con reduced-motion. */
function useTilt() {
  const ref = useRef<HTMLButtonElement>(null);
  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    const rx = (y / r.height - 0.5) * -7;
    const ry = (x / r.width - 0.5) * 9;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return { ref, onMove, onLeave };
}

/** Foglio di dettaglio (drill-down) di un KPI: <dialog> nativo, chiusura Esc/click-fuori. */
function KpiSheet({ detail, onClose }: { detail: KpiDetail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    // Memorizza l'elemento attivo (il KPI di origine) per ripristinare il focus alla chiusura.
    const opener = document.activeElement as HTMLElement | null;
    if (el && !el.open) el.showModal();
    return () => {
      // Al close il focus torna esplicitamente al KPI che ha aperto il foglio (WCAG 2.4.3).
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="cmx-sheet"
      aria-modal="true"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="cmx-sheet-inner">
        <header className="cmx-sheet-head">
          <h2 id={titleId}>{detail.title}</h2>
          <button
            type="button"
            className="cmx-sheet-x"
            aria-label="Chiudi"
            onClick={() => ref.current?.close()}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        {detail.intro && <p className="cmx-sheet-intro">{detail.intro}</p>}
        <dl className="cmx-sheet-rows">
          {detail.rows.map((r) => (
            <div className="cmx-sheet-row" key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        {detail.note && <p className="cmx-sheet-note">{detail.note}</p>}
        {detail.link && (
          <a className="cmx-btn cmx-go cmx-sheet-link" href={detail.link.href}>
            {detail.link.label}
          </a>
        )}
      </div>
    </dialog>
  );
}

function Kpi({ kpi, i }: { kpi: KpiSpec; i: number }) {
  const tilt = useTilt();
  const [open, setOpen] = useState(false);
  const clickable = !!kpi.detail;

  // Il corpo della card è identico nei due casi; cambia solo il contenitore.
  const body = (
    <>
      <Odometer value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
      <div className="cmx-l">{kpi.label}</div>
      <div className={kpi.due ? "cmx-trend cmx-due" : "cmx-trend"}>{kpi.trend}</div>
      {clickable && (
        <span className="cmx-kpi-cta" aria-hidden>
          Riepilogo <span className="cmx-kpi-arrow">→</span>
        </span>
      )}
    </>
  );

  // Senza drill-down la cifra NON deve sparire dall'albero accessibile: invece di un
  // <button disabled> (che gli screen reader saltano) usiamo un <div> leggibile.
  if (!clickable) {
    return (
      <div className="cmx-kpi" style={{ "--i": i } as React.CSSProperties}>
        {body}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={tilt.ref}
        className={kpi.due ? "cmx-kpi cmx-kpi-urgent" : "cmx-kpi"}
        style={{ "--i": i } as React.CSSProperties}
        onMouseMove={tilt.onMove}
        onMouseLeave={tilt.onLeave}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {body}
      </button>
      {open && kpi.detail && <KpiSheet detail={kpi.detail} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ConciergeKpis({ kpis }: { kpis: KpiSpec[] }) {
  return (
    <div className="cmx-kpis" role="group" aria-label="Indicatori a colpo d'occhio">
      {kpis.map((kpi, i) => (
        <Kpi key={kpi.label} kpi={kpi} i={i} />
      ))}
    </div>
  );
}

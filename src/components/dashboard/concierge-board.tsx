"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { generateCheckinLinkAction } from "@/app/stays/[id]/checkin-actions";
import type {
  DashboardAgendaItem,
  DashboardDiaryRow,
  DashboardProposal,
} from "@/app/dashboard/_lib/data";

type PropState = "idle" | "pressing" | "done" | "leave" | "gone";

function nowClock(): string {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

/** Spotlight su mousemove per le proposte (solo le variabili, niente tilt). */
function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return { ref, onMove };
}

function ProposalCard({
  proposal,
  i,
  onApproved,
}: {
  proposal: DashboardProposal;
  i: number;
  onApproved: (text: string) => void;
}) {
  const spot = useSpotlight();
  const [state, setState] = useState<PropState>("idle");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function runStampSequence() {
    setState("pressing");
    timers.current.push(setTimeout(() => setState("done"), 160));
    timers.current.push(setTimeout(() => setState("leave"), 1400));
    timers.current.push(
      setTimeout(() => {
        setState("gone");
        onApproved(proposal.doneText);
      }, 2000),
    );
  }

  async function onPrimary() {
    if (state !== "idle" || busy) return;
    const action = proposal.primary.action;
    if (action.type === "copy-checkin") {
      setBusy(true);
      setError(null);
      try {
        const res = await generateCheckinLinkAction(action.stayId);
        if (!res.ok) {
          setError(res.error);
          setBusy(false);
          return;
        }
        try {
          await navigator.clipboard.writeText(res.url);
          setCopied(true);
        } catch {
          // clipboard negato (es. contesto non sicuro): mostriamo comunque l'esito
          setCopied(true);
        }
        runStampSequence();
      } finally {
        setBusy(false);
      }
    }
  }

  if (state === "gone") return null;

  const cls = [
    "cmx-prop",
    state === "pressing" ? "cmx-pressing" : "",
    state === "done" || state === "leave" ? "cmx-done" : "",
    state === "leave" ? "cmx-leave" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const action = proposal.primary.action;
  const isCopy = action.type === "copy-checkin";

  return (
    <div
      ref={spot.ref}
      className={cls}
      style={{ "--i": i } as React.CSSProperties}
      onMouseMove={spot.onMove}
    >
      <span className="cmx-stamp">FATTO ✓</span>
      <span className="cmx-ring" />
      <div className="cmx-who">
        <div className="cmx-dot" aria-hidden>
          {proposal.emoji}
        </div>
        <div>
          <p>
            <b>{proposal.bold}</b>
            {proposal.rest}
          </p>
          <div className="cmx-meta">{proposal.meta}</div>
          <div className="cmx-acts">
            {isCopy ? (
              <button
                type="button"
                className="cmx-btn cmx-go"
                onClick={onPrimary}
                disabled={busy || state !== "idle"}
              >
                {copied ? "Copiato ✓" : busy ? "Preparo…" : proposal.primary.label}
              </button>
            ) : (
              <Link
                className="cmx-btn cmx-go"
                href={action.type === "link" || action.type === "download" ? action.href : "#"}
              >
                {proposal.primary.label}
              </Link>
            )}
            {proposal.secondary && (
              <Link className="cmx-btn cmx-alt" href={proposal.secondary.href}>
                {proposal.secondary.label}
              </Link>
            )}
            {isCopy && copied && state === "idle" && (
              <span className="cmx-hint">link negli appunti — pronto da mandare</span>
            )}
          </div>
          {error && (
            <p className="cmx-hint" role="alert" style={{ color: "var(--terracotta)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConciergeBoard({
  proposals,
  agenda,
  diary,
  kpisSlot,
}: {
  proposals: DashboardProposal[];
  agenda: DashboardAgendaItem[];
  diary: DashboardDiaryRow[];
  kpisSlot?: ReactNode;
}) {
  const agendaRef = useRef<HTMLDivElement>(null);
  const [extraRows, setExtraRows] = useState<{ time: string; text: string }[]>([]);

  useEffect(() => {
    const el = agendaRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("cmx-seen");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && el.classList.add("cmx-seen")),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function onApproved(text: string) {
    setExtraRows((prev) => [...prev, { time: nowClock(), text }]);
  }

  return (
    <>
      {/* DECISIONI — il vero hero della pagina: a tutta larghezza, prima di tutto. */}
      <section className="cmx-decisions">
        <div className="cmx-col-h">
          {proposals.length > 0
            ? `Aspettano il tuo via libera (${proposals.length})`
            : "Aspettano il tuo via libera"}
        </div>
        {proposals.length === 0 ? (
          <div className="cmx-empty">
            <b>Tutto in ordine.</b> Nessuna proposta in sospeso: quando ci sarà qualcosa da decidere
            — un check-in da mandare, schedine da confermare, un export pronto — lo trovi qui.
          </div>
        ) : (
          <div className="cmx-decision-grid">
            {proposals.map((p, i) => (
              <ProposalCard key={p.id} proposal={p} i={i} onApproved={onApproved} />
            ))}
          </div>
        )}
      </section>

      {/* KPI come striscia di contesto (sotto le decisioni, non protagonisti). */}
      {kpisSlot}

      {/* SECONDARIO, leggero: cosa arriva · cosa ho fatto stanotte. */}
      <div className="cmx-secondary">
        <div>
          <div className="cmx-col-h">In arrivo</div>
          <div className="cmx-agenda" ref={agendaRef}>
            <div className="cmx-tl" />
            {agenda.map((ev, idx) => (
              <div className="cmx-ev" key={idx}>
                <div className="cmx-when">{ev.when}</div>
                <div className="cmx-node" />
                <div>
                  <div className="cmx-t">{ev.title}</div>
                  <div className="cmx-d">
                    {ev.detail}
                    {ev.norma && (
                      <>
                        {" "}
                        <span className="cmx-norma">Norma:</span> {ev.norma}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cmx-diary">
          <div className="cmx-col-h" style={{ marginTop: 0 }}>
            Fatto stanotte
          </div>
          {diary.length === 0 && extraRows.length === 0 ? (
            <div className="cmx-muted">
              Ancora niente stanotte. Appena sincronizzo i calendari o verifico una ricevuta, lo
              annoto qui.
            </div>
          ) : (
            <>
              {diary.map((row, idx) => (
                <div className="cmx-row" key={`d-${idx}`}>
                  <span className="cmx-tm">{row.time}</span>
                  <span className="cmx-check">✓</span>
                  <span>
                    {row.text} — <b>{row.highlight}</b>
                  </span>
                </div>
              ))}
              {extraRows.map((row, idx) => (
                <div className="cmx-row cmx-new" key={`e-${idx}`}>
                  <span className="cmx-tm">{row.time}</span>
                  <span className="cmx-check">✓</span>
                  <span>
                    <b>{row.text}</b>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

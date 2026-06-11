"use client";

import { useEffect, useRef, useState } from "react";

export interface KpiSpec {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  trend: string;
  /** Trend in terracotta (scadenza/urgenza) invece che salvia. */
  due?: boolean;
}

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
      setOffsets(digits.map((d) => -44 * Number(d)));
      return;
    }
    const timers = digits.map((d, idx) =>
      setTimeout(
        () => {
          setOffsets((prev) => {
            const next = [...prev];
            next[idx] = -44 * Number(d);
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
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    const rx = (y / r.height - 0.5) * -7;
    const ry = (x / r.width - 0.5) * 9;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return { ref, onMove, onLeave };
}

function Kpi({ kpi, i }: { kpi: KpiSpec; i: number }) {
  const tilt = useTilt();
  return (
    <div
      ref={tilt.ref}
      className="cmx-kpi"
      style={{ "--i": i } as React.CSSProperties}
      onMouseMove={tilt.onMove}
      onMouseLeave={tilt.onLeave}
    >
      <Odometer value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
      <div className="cmx-l">{kpi.label}</div>
      <div className={kpi.due ? "cmx-trend cmx-due" : "cmx-trend"}>{kpi.trend}</div>
    </div>
  );
}

export function ConciergeKpis({ kpis }: { kpis: KpiSpec[] }) {
  return (
    <div className="cmx-kpis">
      {kpis.map((kpi, i) => (
        <Kpi key={kpi.label} kpi={kpi} i={i} />
      ))}
    </div>
  );
}

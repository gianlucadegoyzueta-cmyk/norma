"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * Un segmento di testo dell'hero. `hi` lo evidenzia in terracotta corsivo; `rotate`
 * lo rende una parola che si auto-sostituisce (le cose vere che Norma gestisce).
 */
export interface HeroSegment {
  text?: string;
  hi?: boolean;
  rotate?: string[];
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Parola dell'hero che ruota tra più alternative (stile homepage marketing: blur + slide +
 * fade, terracotta). Le alternative sono impilate; la larghezza si fissa sulla più lunga per
 * non far saltare il layout. Con reduced-motion resta ferma sulla prima.
 */
function RotatingWord({ words, intervalMs = 2400 }: { words: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length <= 1 || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <span className="cmx-rot">
      <span className="cmx-rot-spacer" aria-hidden>
        {longest}
      </span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={i === index ? "cmx-rot-w is-active" : "cmx-rot-w"}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/**
 * Hero "ink reveal": ogni parola appare con leggera sfocatura/rotazione, a scaglioni.
 * Le righe sono separate da <br>. Il ritardo è incrementale parola-per-parola.
 */
export function ConciergeHero({
  kicker,
  lines,
  sub,
}: {
  kicker: string;
  lines: HeroSegment[][];
  sub: { text: string; bold?: string };
}) {
  let wordIndex = 0;
  return (
    <div className="cmx-hero">
      <div className="cmx-kicker">{kicker}</div>
      <div className="cmx-rule" />
      <h1>
        {lines.map((segments, li) => (
          <Fragment key={li}>
            {li > 0 && <br />}
            {segments.map((seg, si) => {
              // Parola rotante: un'unica unità "ink reveal" che poi cicla da sola.
              if (seg.rotate) {
                const delay = 0.25 + wordIndex * 0.07;
                wordIndex += 1;
                return (
                  <span key={`${si}-rot`} className="cmx-w" style={{ animationDelay: `${delay}s` }}>
                    <RotatingWord words={seg.rotate} />
                  </span>
                );
              }
              const words = (seg.text ?? "").split(/(\s+)/);
              return words.map((w, wi) => {
                if (w.trim() === "") return <Fragment key={`${si}-${wi}`}>{w}</Fragment>;
                const delay = 0.25 + wordIndex * 0.07;
                wordIndex += 1;
                return (
                  <span
                    key={`${si}-${wi}`}
                    className="cmx-w"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {seg.hi ? <span className="cmx-hi">{w}</span> : w}
                  </span>
                );
              });
            })}
          </Fragment>
        ))}
      </h1>
      {(sub.text || sub.bold) && (
        <p className="cmx-sub">
          {sub.bold && <b>{sub.bold} </b>}
          {sub.text}
        </p>
      )}
    </div>
  );
}

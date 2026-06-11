"use client";

import { Fragment } from "react";

/** Un segmento di testo dell'hero; `hi` lo evidenzia in terracotta corsivo. */
export interface HeroSegment {
  text: string;
  hi?: boolean;
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
              const words = seg.text.split(/(\s+)/);
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

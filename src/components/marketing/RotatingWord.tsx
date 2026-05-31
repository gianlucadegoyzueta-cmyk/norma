"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Parola dell'hero che ruota tra più alternative (effetto ispirato a mimprep.com).
 * Le parole sono impilate in sovrapposizione: quella attiva è visibile, le altre sfumano.
 * La larghezza si adatta alla parola più lunga (resa invisibile) per evitare salti di layout.
 */
export function RotatingWord({
  words,
  intervalMs = 2200,
  className,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className={cn("relative inline-grid align-bottom", className)}>
      {/* Spaziatore invisibile: fissa la larghezza sulla parola più lunga. */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {longest}
      </span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={cn(
            "from-primary to-primary/70 col-start-1 row-start-1 bg-linear-to-r bg-clip-text whitespace-nowrap text-transparent transition-all duration-500 ease-out",
            i === index ? "blur-0 translate-y-0 opacity-100" : "translate-y-2 opacity-0 blur-sm",
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Aiuto contestuale (PARTE 6/FASE 3): un "?" accanto a uno stato/numero che spiega
// "cosa significa / cosa fare ora", senza portare via dalla pagina. Presentazionale, accessibile
// (bottone con aria-expanded, chiude su Escape e click esterno). L'assistenza-chat resta il
// SupportWidget globale; questo è il micro-aiuto inline.
export function InfoHint({
  label,
  title,
  children,
  align = "left",
  className,
}: {
  /** Etichetta per screen-reader del bottone (es. "Cosa significa 'da verificare'"). */
  label: string;
  /** Titolo opzionale del popover. */
  title?: string;
  /** Corpo della spiegazione. */
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "text-muted-foreground/70 hover:text-foreground inline-flex items-center justify-center rounded-full transition-colors",
          open && "text-foreground",
        )}
      >
        <HelpCircle className="size-[15px]" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 w-[260px] rounded-xl border border-[var(--brand-hairline)] bg-[var(--brand-carta)] p-3 text-left shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {title && (
            <span className="text-foreground mb-1 block text-[12.5px] font-semibold">{title}</span>
          )}
          <span className="text-muted-foreground block text-[12.5px] leading-relaxed">
            {children}
          </span>
        </span>
      )}
    </span>
  );
}

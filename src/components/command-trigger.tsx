"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { COMMAND_OPEN_EVENT } from "./command-palette";

/** Bottone discreto nell'header: apre la command palette (⌘K). Mostra la scorciatoia su desktop. */
export function CommandTrigger() {
  // Su macOS mostra ⌘, altrove Ctrl. Calcolato dopo il mount per evitare mismatch di idratazione.
  const [meta, setMeta] = React.useState<string | null>(null);
  React.useEffect(() => {
    const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    setMeta(isMac ? "⌘" : "Ctrl");
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COMMAND_OPEN_EVENT))}
      aria-label="Apri i comandi rapidi"
      className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm outline-none focus-visible:ring-2"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Cerca</span>
      {meta && (
        <kbd className="border-border hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          {meta}K
        </kbd>
      )}
    </button>
  );
}

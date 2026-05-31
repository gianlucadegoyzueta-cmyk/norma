"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TypeaheadOption {
  id: string;
  label: string;
}

const MAX_VISIBLE = 40;

/**
 * Typeahead accessibile per il Comune (wizard-local, per non accoppiarsi al branch UX). Pattern ARIA
 * combobox+listbox: filtro in memoria, risultati capati, "nessuna corrispondenza", errore collegato
 * via aria-describedby. Risolve l'etichetta scelta in un id, inviato tramite input hidden.
 */
export function ComuneTypeahead({
  name,
  options,
  id,
  placeholder,
  required,
  describedBy,
}: {
  name: string;
  options: TypeaheadOption[];
  id: string;
  placeholder?: string;
  required?: boolean;
  describedBy?: string;
}) {
  const listboxId = `${id}-listbox`;
  const errorId = `${id}-error`;

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [selected, setSelected] = React.useState<TypeaheadOption | null>(null);
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { filtered, total } = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { filtered: options.slice(0, MAX_VISIBLE), total: options.length };
    const out: TypeaheadOption[] = [];
    let count = 0;
    for (const o of options) {
      if (o.label.toLowerCase().includes(q)) {
        count += 1;
        if (out.length < MAX_VISIBLE) out.push(o);
      }
    }
    return { filtered: out, total: count };
  }, [query, options]);

  const unmatched = query.trim() !== "" && !selected;
  const describedByIds =
    [describedBy, unmatched ? errorId : null].filter(Boolean).join(" ") || undefined;

  function choose(opt: TypeaheadOption) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setSelected(opt);
    setQuery(opt.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
    const exact = options.find((o) => o.label.toLowerCase() === value.trim().toLowerCase());
    setSelected(exact ?? null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault();
      choose(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-invalid={unmatched || undefined}
        aria-describedby={describedByIds}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        className={cn(unmatched && "border-destructive")}
      />
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />

      {open && (
        <ul
          role="listbox"
          id={listboxId}
          className="bg-popover text-popover-foreground border-border absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li role="option" aria-disabled aria-selected={false} className="text-muted-foreground px-2 py-1.5 text-sm">
              Nessuna corrispondenza
            </li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={selected?.id === o.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "cursor-pointer rounded px-2 py-1.5 text-sm",
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                {o.label}
              </li>
            ))
          )}
          {total > filtered.length && (
            <li aria-hidden className="text-muted-foreground px-2 py-1.5 text-xs">
              …e altri {total - filtered.length}. Affina la ricerca.
            </li>
          )}
        </ul>
      )}

      {unmatched && (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          Seleziona una voce dall&apos;elenco.
        </p>
      )}
    </div>
  );
}

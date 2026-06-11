"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CornerDownLeft,
  Link2,
  Loader2,
  type LucideIcon,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { imminentCheckinLinkAction, syncAllIcalAction } from "./command-actions";

/** Evento globale per aprire la palette da fuori (bottone header, FAB mobile). */
export const COMMAND_OPEN_EVENT = "norma:command-open";

type Group = "Vai a" | "Azioni rapide";

interface Command {
  id: string;
  label: string;
  group: Group;
  Icon: LucideIcon;
  keywords?: string;
  /** Esegue il comando. Ritorna `false` per tenere aperta la palette (azioni con feedback). */
  run: () => void | boolean | Promise<void | boolean>;
}

type Status =
  | { kind: "idle" }
  | { kind: "pending"; id: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();

  const close = React.useCallback(() => setOpen(false), []);

  // Comandi: navigazione (tutte le sezioni) + azioni rapide. Memoizzati: dipendono solo dal router.
  const commands = React.useMemo<Command[]>(() => {
    const nav: Command[] = NAV_SECTIONS.map((s) => ({
      id: `nav:${s.href}`,
      label: s.label,
      group: "Vai a",
      Icon: s.Icon,
      keywords: s.keywords,
      run: () => router.push(s.href),
    }));

    const actions: Command[] = [
      {
        id: "action:new-stay",
        label: "Nuovo soggiorno",
        group: "Azioni rapide",
        Icon: Plus,
        keywords: "crea aggiungi prenotazione ospite",
        run: () => router.push("/stays"),
      },
      {
        id: "action:sync-ical",
        label: "Sincronizza iCal",
        group: "Azioni rapide",
        Icon: RefreshCw,
        keywords: "calendario airbnb booking importa aggiorna",
        run: async () => {
          setStatus({ kind: "pending", id: "action:sync-ical" });
          const res = await syncAllIcalAction();
          setStatus(
            res.ok
              ? { kind: "success", message: res.message }
              : { kind: "error", message: res.error },
          );
          if (res.ok) router.refresh();
          return false;
        },
      },
      {
        id: "action:copy-checkin",
        label: "Copia link check-in dell'arrivo imminente",
        group: "Azioni rapide",
        Icon: Link2,
        keywords: "ospite condividi clipboard prossimo",
        run: async () => {
          setStatus({ kind: "pending", id: "action:copy-checkin" });
          const res = await imminentCheckinLinkAction();
          if (!res.ok) {
            setStatus({ kind: "error", message: res.error });
            return false;
          }
          try {
            await navigator.clipboard.writeText(res.url);
            setStatus({ kind: "success", message: `Link copiato — ${res.label}` });
          } catch {
            // Clipboard negata (permessi/contesto non sicuro): mostra comunque l'esito.
            setStatus({ kind: "error", message: `Link pronto ma non copiato — ${res.label}` });
          }
          return false;
        },
      },
    ];

    return [...nav, ...actions];
  }, [router]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Apertura via scorciatoia ⌘K / Ctrl-K (ovunque) o evento globale (bottone header, FAB).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_OPEN_EVENT, onOpen);
    };
  }, []);

  // All'apertura: azzera ricerca/selezione/stato, blocca lo scroll del body, dà fuoco all'input.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setStatus({ kind: "idle" });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [open]);

  // La selezione non deve mai uscire dalla lista filtrata.
  React.useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  async function runCommand(cmd: Command) {
    const keepOpen = await cmd.run();
    if (keepOpen !== false) close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) void runCommand(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  // Indici globali per attivo/aria, ma raggruppati per intestazione nella resa.
  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[16vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-foreground/30 absolute inset-0 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comandi rapidi"
        className="bg-popover text-popover-foreground border-border relative w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl"
      >
        <div className="border-border flex items-center gap-2.5 border-b px-3.5">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Cerca una sezione o un'azione…"
            className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
          />
          <kbd className="text-muted-foreground border-border hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            esc
          </kbd>
        </div>

        <ul role="listbox" id={listId} className="max-h-[min(60vh,24rem)] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li role="presentation" className="text-muted-foreground px-3 py-6 text-center text-sm">
              Nessun comando trovato.
            </li>
          ) : (
            (["Vai a", "Azioni rapide"] as Group[]).map((group) => {
              const items = filtered.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <li key={group} role="presentation">
                  <div className="text-muted-foreground px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
                    {group}
                  </div>
                  <ul role="presentation">
                    {items.map((cmd) => {
                      runningIndex += 1;
                      const idx = runningIndex;
                      const isActive = idx === activeIndex;
                      const isPending = status.kind === "pending" && status.id === cmd.id;
                      return (
                        <li
                          key={cmd.id}
                          id={`${listId}-${idx}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void runCommand(cmd);
                          }}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                            isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <cmd.Icon
                              className={cn(
                                "size-4 shrink-0",
                                isActive ? "" : "text-muted-foreground",
                              )}
                              aria-hidden
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                          {isActive && (
                            <CornerDownLeft
                              className="text-muted-foreground size-3.5 shrink-0"
                              aria-hidden
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })
          )}
        </ul>

        {status.kind === "success" || status.kind === "error" ? (
          <div
            role="status"
            className={cn(
              "border-border flex items-center gap-2 border-t px-3.5 py-2.5 text-xs",
              status.kind === "success" ? "text-success" : "text-destructive",
            )}
          >
            {status.kind === "success" ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className="min-w-0 truncate">{status.message}</span>
          </div>
        ) : (
          <div className="border-border text-muted-foreground hidden items-center gap-3 border-t px-3.5 py-2 text-[11px] sm:flex">
            <span className="inline-flex items-center gap-1">
              <kbd className="border-border rounded border px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="border-border rounded border px-1 py-0.5 font-mono">↓</kbd>
              per scorrere
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="border-border rounded border px-1 py-0.5 font-mono">↵</kbd>
              per scegliere
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface PropertySwitcherOption {
  id: string;
  name: string;
}

export interface PropertySwitcherProps {
  options: readonly PropertySwitcherOption[];
  /** Id selezionato, oppure null per la vista "Tutte le strutture". */
  selectedId: string | null;
}

/**
 * Switcher di proprietà per la vista d'agenzia: passa rapidamente da "Tutte" a una singola
 * struttura. Filtro server-side via search param `?property=<id>` → sono semplici link (GET):
 * condivisibili, bookmarkabili, refresh-safe e navigabili da tastiera senza JS aggiuntivo.
 * Identità "carta": riusa le pill `.cmx-sc` del design system. `aria-current` segna l'attivo.
 */
export function PropertySwitcher({ options, selectedId }: PropertySwitcherProps) {
  const pathname = usePathname();
  const href = (id: string | null) => (id ? `${pathname}?property=${id}` : pathname);

  return (
    <nav className="cmx-quicknav" aria-label="Filtra per struttura">
      <span className="cmx-sc-label">Struttura</span>
      <span className="cmx-quicknav-pills">
        <Link
          className="cmx-sc"
          href={href(null)}
          aria-current={selectedId === null ? "true" : undefined}
          data-active={selectedId === null ? "true" : undefined}
        >
          Tutte
        </Link>
        {options.map((opt) => (
          <Link
            key={opt.id}
            className="cmx-sc"
            href={href(opt.id)}
            aria-current={selectedId === opt.id ? "true" : undefined}
            data-active={selectedId === opt.id ? "true" : undefined}
          >
            {opt.name}
          </Link>
        ))}
      </span>
    </nav>
  );
}

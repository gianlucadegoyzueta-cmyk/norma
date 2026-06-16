import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  CalendarCheck,
  ScrollText,
  BarChart3,
  Building2,
  KeyRound,
  CreditCard,
  Settings,
} from "lucide-react";

// Mappa di navigazione dell'app-shell, condivisa da sidebar e breadcrumb.
// `href` è anche la chiave di match per lo stato attivo (longest-prefix su pathname).
export type NavItem = { key: string; label: string; href: string; icon: LucideIcon };

export const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutGrid }] },
  {
    heading: "Adempimenti",
    items: [
      { key: "stays", label: "Soggiorni", href: "/stays", icon: CalendarCheck },
      { key: "schedine", label: "Schedine", href: "/schedine", icon: ScrollText },
      { key: "istat", label: "Movimento ISTAT", href: "/istat", icon: BarChart3 },
    ],
  },
  {
    heading: "Struttura",
    items: [
      { key: "properties", label: "Immobili", href: "/properties", icon: Building2 },
      { key: "credentials", label: "Credenziali", href: "/credentials", icon: KeyRound },
    ],
  },
  {
    heading: "Account",
    items: [
      { key: "billing", label: "Abbonamento", href: "/billing", icon: CreditCard },
      { key: "account", label: "Impostazioni", href: "/account", icon: Settings },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);

/** Voce attiva per il pathname corrente (match per prefisso più lungo). */
export function matchActive(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const it of ALL) {
    if (pathname === it.href || pathname.startsWith(it.href + "/")) {
      if (!best || it.href.length > best.href.length) best = it;
    }
  }
  return best;
}

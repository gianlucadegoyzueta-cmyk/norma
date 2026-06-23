import type { LucideIcon } from "lucide-react";
import { NAV_GROUPS, matchActive as matchActiveSection } from "@/lib/nav";

// Mappa di navigazione dell'app-shell, condivisa da sidebar e breadcrumb.
// SORGENTE UNICA: `@/lib/nav` (la stessa che alimenta command palette e bottom-bar mobile).
// Qui si adatta solo la FORMA al consumo della sidebar (`icon` minuscolo), senza ridefinire
// le destinazioni: aggiungere/togliere/rinominare una voce si fa in un solo posto.
// `href` è anche la chiave di match per lo stato attivo (longest-prefix su pathname).
export type NavItem = { key: string; label: string; href: string; icon: LucideIcon };

export const NAV: { heading?: string; items: NavItem[] }[] = NAV_GROUPS.map((group) => ({
  heading: group.heading,
  items: group.items.map((s) => ({ key: s.key, label: s.label, href: s.href, icon: s.Icon })),
}));

/** Voce attiva per il pathname corrente (match per prefisso più lungo). */
export function matchActive(pathname: string): NavItem | undefined {
  const s = matchActiveSection(pathname);
  if (!s) return undefined;
  return { key: s.key, label: s.label, href: s.href, icon: s.Icon };
}

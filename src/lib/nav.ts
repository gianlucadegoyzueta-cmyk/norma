import {
  BarChart3,
  Building2,
  CalendarCheck,
  Coins,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  type LucideIcon,
  ScrollText,
  Settings,
} from "lucide-react";

/**
 * Sorgente UNICA delle sezioni di navigazione dell'area autenticata.
 *
 * Tutte e tre le superfici (sidebar app-shell, command palette ⌘K, bottom-bar mobile)
 * leggono da qui, così l'host vede le STESSE voci ovunque. La forma raggruppata `NAV`
 * pilota la sidebar (e la breadcrumb via `matchActive`); `NAV_SECTIONS` è l'elenco piatto
 * per la palette; `MOBILE_SECTIONS` è il sottoinsieme curato della bottom-bar.
 */
export interface NavSection {
  /** Chiave stabile (anche per lo stato attivo nella sidebar). */
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Parole chiave extra per il match nella ricerca ⌘K (sinonimi non presenti nell'etichetta). */
  keywords?: string;
}

/** Un gruppo di sezioni nella sidebar (intestazione opzionale). */
export interface NavGroup {
  heading?: string;
  items: NavSection[];
}

/** Navigazione raggruppata — l'elenco autorevole, in ordine di rilevanza per l'host. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
        Icon: LayoutGrid,
        keywords: "home inizio",
      },
      // Vista agenzia multi-immobile per i PM (#117), raggiungibile dalla sidebar.
      {
        key: "agency",
        href: "/agency",
        label: "Strutture",
        Icon: LayoutDashboard,
        keywords: "agenzia multi immobile pm portfolio",
      },
    ],
  },
  // Pilastro 1 — Alloggiati: il lavoro ricorrente del cliente. L'azione (outbox schedine)
  // per prima, il soggiorno la alimenta.
  {
    heading: "Alloggiati",
    items: [
      {
        key: "schedine",
        href: "/schedine",
        label: "Schedine",
        Icon: ScrollText,
        keywords: "alloggiati invii outbox polizia questura",
      },
      {
        key: "stays",
        href: "/stays",
        label: "Soggiorni",
        Icon: CalendarCheck,
        keywords: "prenotazioni ospiti arrivi check-in",
      },
    ],
  },
  // Pilastro 2 — Turismo: ISTAT primario, tassa di soggiorno secondaria.
  {
    heading: "Turismo",
    items: [
      {
        key: "istat",
        href: "/istat",
        label: "Movimento ISTAT",
        Icon: BarChart3,
        keywords: "movimento turistico statistiche istat ross1000",
      },
      {
        key: "tourist-tax",
        href: "/tourist-tax",
        label: "Tassa di soggiorno",
        Icon: Coins,
        keywords: "imposta tax soggiorno",
      },
    ],
  },
  {
    heading: "Configurazione",
    items: [
      {
        key: "properties",
        href: "/properties",
        label: "Immobili",
        Icon: Building2,
        keywords: "case strutture cin",
      },
      {
        key: "credentials",
        href: "/credentials",
        label: "Credenziali",
        Icon: KeyRound,
        keywords: "alloggiati web password",
      },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        key: "billing",
        href: "/billing",
        label: "Abbonamento",
        Icon: CreditCard,
        keywords: "pagamento fattura stripe",
      },
      {
        key: "account",
        href: "/account",
        label: "Impostazioni",
        Icon: Settings,
        keywords: "profilo preferenze impostazioni",
      },
      {
        key: "support",
        href: "/support",
        label: "Assistenza",
        Icon: LifeBuoy,
        keywords: "aiuto supporto domande chat assistente ai",
      },
    ],
  },
];

/** Elenco piatto di tutte le sezioni (ordine = ordine dei gruppi). Usato dalla command palette. */
export const NAV_SECTIONS: NavSection[] = NAV_GROUPS.flatMap((g) => g.items);

/** Indice per chiave, per comporre sottoinsiemi curati senza disallineare href/label/icona. */
const BY_KEY = new Map(NAV_SECTIONS.map((s) => [s.key, s]));

function section(key: string): NavSection {
  const s = BY_KEY.get(key);
  if (!s) throw new Error(`NAV_SECTIONS: chiave sconosciuta "${key}"`);
  return s;
}

/**
 * Le 4 sezioni chiave della bottom-bar mobile: dashboard + i DUE pilastri (schedine, ISTAT) +
 * i soggiorni che li alimentano. La tassa è secondaria (resta in sidebar e ⌘K, non in bottom-bar).
 */
export const MOBILE_SECTIONS: NavSection[] = [
  section("dashboard"),
  section("schedine"),
  section("istat"),
  section("stays"),
];

/** Voce attiva per il pathname corrente (match per prefisso più lungo). */
export function matchActive(pathname: string): NavSection | undefined {
  let best: NavSection | undefined;
  for (const s of NAV_SECTIONS) {
    if (pathname === s.href || pathname.startsWith(s.href + "/")) {
      if (!best || s.href.length > best.href.length) best = s;
    }
  }
  return best;
}

import {
  BarChart3,
  BedDouble,
  Building2,
  CreditCard,
  FileText,
  type LucideIcon,
  KeyRound,
  LayoutDashboard,
  Receipt,
} from "lucide-react";

/** Una sezione navigabile dell'app. Sorgente unica per command palette e bottom-bar mobile. */
export interface NavSection {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Parole chiave extra per il match nella ricerca ⌘K (sinonimi non presenti nell'etichetta). */
  keywords?: string;
}

/** Tutte le sezioni dell'area autenticata, in ordine di rilevanza per l'host. */
export const NAV_SECTIONS: NavSection[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, keywords: "home inizio" },
  { href: "/stays", label: "Soggiorni", Icon: BedDouble, keywords: "prenotazioni ospiti arrivi" },
  { href: "/schedine", label: "Schedine", Icon: FileText, keywords: "alloggiati invii outbox" },
  { href: "/properties", label: "Immobili", Icon: Building2, keywords: "case strutture cin" },
  { href: "/tourist-tax", label: "Tassa di soggiorno", Icon: Receipt, keywords: "imposta tax" },
  { href: "/istat", label: "ISTAT", Icon: BarChart3, keywords: "movimento turistico statistiche" },
  {
    href: "/credentials",
    label: "Credenziali",
    Icon: KeyRound,
    keywords: "alloggiati web password",
  },
  {
    href: "/billing",
    label: "Abbonamento",
    Icon: CreditCard,
    keywords: "pagamento fattura stripe",
  },
];

/** Le 4 sezioni chiave della bottom-bar mobile (uso quotidiano dell'host). */
export const MOBILE_SECTIONS: NavSection[] = [
  NAV_SECTIONS[0], // Dashboard
  NAV_SECTIONS[1], // Soggiorni
  NAV_SECTIONS[2], // Schedine
  NAV_SECTIONS[4], // Tassa di soggiorno
];

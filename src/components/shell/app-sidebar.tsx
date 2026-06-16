import Link from "next/link";
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
  Search,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SealMark } from "@/components/ui/seal-mark";

// App-shell laterale (struttura ispirata allo Studio di Supabase: switcher di workspace,
// ricerca ⌘K, nav raggruppata con stato attivo, footer utente) vestita "Carta & Inchiostro".
// Presentazionale: `active` indica la sezione corrente (in produzione verrà da usePathname).
type NavItem = { key: string; label: string; href: string; icon: LucideIcon; badge?: string };

const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutGrid }] },
  {
    heading: "Adempimenti",
    items: [
      { key: "stays", label: "Soggiorni", href: "/stays", icon: CalendarCheck },
      { key: "schedine", label: "Schedine", href: "/schedine", icon: ScrollText, badge: "3" },
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

export function AppSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-[var(--brand-hairline)] bg-[var(--brand-carta)] lg:flex">
      {/* Marchio */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--brand-hairline)]/70 px-4">
        <SealMark className="text-primary size-7" />
        <span className="font-display text-foreground text-[17px] font-semibold tracking-tight">
          Norma
        </span>
      </div>

      {/* Switcher struttura + ricerca */}
      <div className="space-y-2 px-3 pt-3 pb-2">
        <button className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/60 px-2.5 py-2 text-left transition-colors hover:bg-[var(--brand-avorio)]">
          <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
            <Building2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-[13px] font-medium">
              Villa Vista · Como
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">3 strutture</span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>

        <div className="text-muted-foreground flex h-9 items-center gap-2 rounded-lg border border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/40 px-2.5">
          <Search className="size-3.5" />
          <span className="text-[13px]">Cerca…</span>
          <kbd className="text-muted-foreground ml-auto rounded border border-[var(--brand-hairline)] bg-[var(--brand-carta)] px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Navigazione */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map((group, gi) => (
          <div key={group.heading ?? "main"} className={cn(gi > 0 && "mt-5")}>
            {group.heading && (
              <div className="text-muted-foreground/70 px-2 pb-1.5 text-[11px] font-medium tracking-[0.08em] uppercase">
                {group.heading}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((it) => {
                const isActive = it.key === active;
                const Icon = it.icon;
                return (
                  <li key={it.key}>
                    <Link
                      href={it.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                        isActive
                          ? "bg-primary/[0.08] text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-[var(--brand-avorio)]",
                      )}
                    >
                      {isActive && (
                        <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full" />
                      )}
                      <Icon
                        className={cn(
                          "size-[17px] shrink-0",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground bg-[var(--brand-hairline)]/60",
                          )}
                        >
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer utente */}
      <div className="border-t border-[var(--brand-hairline)]/70 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--brand-avorio)]">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--brand-salvia-soft)] text-[12px] font-medium text-[var(--brand-salvia)]">
            GD
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-[13px] font-medium">Gianluca</span>
            <span className="text-muted-foreground block truncate text-[11px]">
              gianluca@norma.casa
            </span>
          </span>
          <LogOut className="text-muted-foreground size-4" />
        </div>
      </div>
    </aside>
  );
}

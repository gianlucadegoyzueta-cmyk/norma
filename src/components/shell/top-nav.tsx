"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, ChevronDown, LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SealMark } from "@/components/ui/seal-mark";
import { CommandTrigger } from "@/components/command-trigger";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
import { NAV, matchActive, type NavItem } from "./shell-nav";

// Barra in alto del nuovo guscio (sostituisce la sidebar laterale ingombrante, #PARTE6/FASE2):
// marchio + nav orizzontale che mette in evidenza i DUE pilastri + cluster account a destra.
// La SORGENTE delle voci resta `@/lib/nav` (via shell-nav) — stesse destinazioni di ⌘K e bottom-bar.
// Solo presentazione: nessuna logica di dominio. Lo stato attivo deriva da usePathname; `active`
// lo forza (anteprime dev).

type Workspace = { name: string; sub?: string };
type User = { name: string; email?: string; initials: string };

/** Le tre voci "spina dorsale" sempre visibili in barra: home + i due pilastri (azione per pilastro). */
const SPINE_KEYS = ["dashboard", "schedine", "istat"] as const;
/** Voci del cluster "account" (a destra, nel menu utente). */
const ACCOUNT_KEYS = ["billing", "account", "support"] as const;

function flatItems(): NavItem[] {
  return NAV.flatMap((g) => g.items);
}

/** Menu a tendina leggero: bottone + pannello, chiude su click-esterno ed Escape. */
function Dropdown({
  label,
  icon,
  active,
  align = "left",
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
          active || open
            ? "bg-primary/[0.08] text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-[var(--brand-avorio)]",
        )}
      >
        {icon}
        {label}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 min-w-[220px] rounded-xl border border-[var(--brand-hairline)] bg-[var(--brand-carta)] p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuLink({
  item,
  activeKey,
  close,
}: {
  item: NavItem;
  activeKey?: string;
  close: () => void;
}) {
  const Icon = item.icon;
  const isActive = item.key === activeKey;
  return (
    <Link
      role="menuitem"
      href={item.href}
      onClick={close}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
        isActive
          ? "bg-primary/[0.08] text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-[var(--brand-avorio)]",
      )}
    >
      <Icon
        className={cn("size-[17px] shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function TopNav({
  active,
  workspace,
  user,
  signOutSlot,
}: {
  active?: string;
  workspace?: Workspace;
  user?: User;
  /** Form/azione di logout (server action), reso in fondo al menu utente. */
  signOutSlot?: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const activeKey = active ?? matchActive(pathname)?.key;
  const ws = workspace ?? { name: "Le tue strutture" };
  const u = user ?? { name: "Il tuo account", initials: "N" };

  const all = flatItems();
  const byKey = new Map(all.map((i) => [i.key, i] as const));
  const spine = SPINE_KEYS.map((k) => byKey.get(k)).filter((x): x is NavItem => Boolean(x));
  const accountKeys = new Set<string>(ACCOUNT_KEYS);
  const spineKeys = new Set<string>(SPINE_KEYS);
  // "Altro": tutto ciò che non è spina dorsale né cluster account, raggruppato come in sidebar.
  const moreGroups = NAV.map((g) => ({
    heading: g.heading,
    items: g.items.filter((i) => !spineKeys.has(i.key) && !accountKeys.has(i.key)),
  })).filter((g) => g.items.length > 0);
  const moreActive = moreGroups.some((g) => g.items.some((i) => i.key === activeKey));
  const accountItems = ACCOUNT_KEYS.map((k) => byKey.get(k)).filter((x): x is NavItem =>
    Boolean(x),
  );
  const accountActive = accountKeys.has(activeKey ?? "");

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-avorio)]/70">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-4 lg:px-6">
        {/* Hamburger + cassetto (solo mobile/<lg): riusa la nav raggruppata della sidebar. */}
        <MobileSidebarDrawer
          active={active}
          workspace={workspace}
          user={user}
          className="-ml-1 lg:hidden"
        />
        {/* Marchio */}
        <Link href="/dashboard" className="mr-1 flex items-center gap-2.5">
          <SealMark className="text-primary size-7" />
          <span className="font-display text-foreground hidden text-[17px] font-semibold tracking-tight sm:inline">
            Norma
          </span>
        </Link>

        {/* Nav orizzontale (≥lg): spina dorsale + Altro */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {spine.map((it) => {
            const Icon = it.icon;
            const isActive = it.key === activeKey;
            return (
              <Link
                key={it.key}
                href={it.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-[var(--brand-avorio)]",
                )}
              >
                <Icon
                  className={cn("size-[17px]", isActive ? "text-primary" : "text-muted-foreground")}
                />
                {it.label}
              </Link>
            );
          })}
          {moreGroups.length > 0 && (
            <Dropdown
              label="Altro"
              icon={<MoreHorizontal className="size-4" aria-hidden />}
              active={moreActive}
            >
              {(close) =>
                moreGroups.map((g, gi) => (
                  <div key={g.heading ?? "main"} className={cn(gi > 0 && "mt-1")}>
                    {g.heading && (
                      <div className="text-muted-foreground/70 px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.08em] uppercase">
                        {g.heading}
                      </div>
                    )}
                    {g.items.map((it) => (
                      <MenuLink key={it.key} item={it} activeKey={activeKey} close={close} />
                    ))}
                  </div>
                ))
              }
            </Dropdown>
          )}
        </nav>

        {/* Cluster destro: ricerca ⌘K, struttura corrente, menu utente */}
        <div className="ml-auto flex items-center gap-2">
          <CommandTrigger />
          <Link
            href="/properties"
            title={ws.name}
            className="bg-card text-muted-foreground hover:text-foreground hidden h-9 items-center gap-2 rounded-lg border border-[var(--brand-hairline)] px-2.5 text-[12.5px] transition-colors md:flex"
          >
            <Building2 className="size-4" />
            <span className="max-w-[160px] truncate">{ws.name}</span>
          </Link>

          <Dropdown
            align="right"
            active={accountActive}
            label={
              <span className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-salvia-soft)] text-[11px] font-medium text-[var(--brand-salvia-ink)]">
                  {u.initials}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{u.name}</span>
              </span>
            }
          >
            {(close) => (
              <>
                <div className="border-b border-[var(--brand-hairline)]/70 px-2.5 py-2">
                  <span className="text-foreground block truncate text-[13px] font-medium">
                    {u.name}
                  </span>
                  {u.email && (
                    <span className="text-muted-foreground block truncate text-[11px]">
                      {u.email}
                    </span>
                  )}
                </div>
                <div className="py-1">
                  {accountItems.map((it) => (
                    <MenuLink key={it.key} item={it} activeKey={activeKey} close={close} />
                  ))}
                </div>
                {signOutSlot && (
                  <div className="border-t border-[var(--brand-hairline)]/70 pt-1" onClick={close}>
                    {signOutSlot}
                  </div>
                )}
                {!signOutSlot && (
                  <div className="border-t border-[var(--brand-hairline)]/70 pt-1">
                    <Link
                      role="menuitem"
                      href="/account"
                      onClick={close}
                      className="text-muted-foreground hover:text-foreground flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors hover:bg-[var(--brand-avorio)]"
                    >
                      <LogOut className="size-[17px]" />
                      Esci
                    </Link>
                  </div>
                )}
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

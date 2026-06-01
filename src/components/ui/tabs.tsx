"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs minimali e accessibili (nessuna dipendenza). Roles ARIA corretti (tablist/tab/tabpanel),
 * `aria-selected`, `aria-controls`/`aria-labelledby`. Tutti i trigger restano raggiungibili da Tab
 * (niente roving tabindex → nessun rischio di trap); frecce ←/→ spostano la selezione.
 */
interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  idBase: string;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("I componenti Tabs vanno usati dentro <Tabs>.");
  return ctx;
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = React.useCallback(
    (v: string) => {
      if (controlled === undefined) setInternal(v);
      onValueChange?.(v);
    },
    [controlled, onValueChange],
  );
  const idBase = React.useId();

  return (
    <TabsContext.Provider value={{ value, setValue, idBase }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const idx = tabs.findIndex((t) => t === document.activeElement);
    if (idx < 0) return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight" ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
    tabs[next]?.focus();
    tabs[next]?.click();
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useTabs();
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.idBase}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${ctx.idBase}-panel-${value}`}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "ring-offset-background focus-visible:ring-ring inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useTabs();
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.idBase}-panel-${value}`}
      aria-labelledby={`${ctx.idBase}-tab-${value}`}
      className={cn("outline-none", className)}
    >
      {children}
    </div>
  );
}

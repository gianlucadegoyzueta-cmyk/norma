import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

// Guscio dell'app: sidebar persistente (desktop) + colonna con topbar sticky e contenuto.
// `breadcrumb` e `actions` popolano la topbar; `active` evidenzia la voce di nav corrente.
export function AppShell({
  active,
  breadcrumb,
  actions,
  children,
}: {
  active: string;
  breadcrumb: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="text-foreground flex min-h-screen bg-[var(--brand-avorio)]">
      <AppSidebar active={active} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/80 px-5 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-avorio)]/70">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-[13px]">
            {breadcrumb}
          </div>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        <main className="flex-1 px-6 py-7 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

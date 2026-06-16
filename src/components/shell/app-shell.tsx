import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { ShellBreadcrumb } from "./shell-breadcrumb";

type Workspace = { name: string; sub?: string };
type User = { name: string; email?: string; initials: string };

// Guscio dell'app: sidebar persistente (desktop) + colonna con topbar sticky e contenuto.
// La topbar mostra una breadcrumb (default derivata dal pathname) + le `actions`; il <main>
// è neutro (nessun padding) — la spaziatura interna la decide il contenuto (.cmx-wrap o wrapper proprio).
export function AppShell({
  active,
  breadcrumb,
  actions,
  workspace,
  user,
  children,
}: {
  active?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  workspace?: Workspace;
  user?: User;
  children: ReactNode;
}) {
  return (
    <div className="text-foreground flex min-h-screen bg-[var(--brand-avorio)]">
      <a
        href="#main-content"
        className="bg-card text-foreground focus:ring-ring sr-only rounded-md px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:ring-2"
      >
        Salta al contenuto
      </a>
      <AppSidebar active={active} workspace={workspace} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/80 px-5 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-avorio)]/70">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-[13px]">
            {breadcrumb ?? <ShellBreadcrumb />}
          </div>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

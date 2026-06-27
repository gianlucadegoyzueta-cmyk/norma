import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { getCurrentContext } from "@/server/auth/session";
import { TopNav } from "./top-nav";
import { ShellBreadcrumb } from "./shell-breadcrumb";

type Workspace = { name: string; sub?: string };
type User = { name: string; email?: string; initials: string };
type Organization = { organizationId: string; organizationName: string; role: string };

// Guscio dell'app (PARTE 6/FASE 2): BARRA IN ALTO al posto della sidebar laterale, per dare più
// spazio ai contenuti. La top-bar (TopNav) ospita marchio, nav orizzontale sui due pilastri e il
// menu utente; sotto, una sotto-barra slim con breadcrumb (sx) + azioni di pagina (dx). Il <main>
// è neutro (nessun padding) — la spaziatura interna la decide il contenuto (.cmx-wrap o wrapper proprio).
// API invariata rispetto al guscio precedente (active/breadcrumb/actions/workspace/user/children),
// più `signOutSlot` che finisce nel menu utente.
export async function AppShell({
  active,
  breadcrumb,
  actions,
  workspace,
  user,
  signOutSlot,
  children,
}: {
  active?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  workspace?: Workspace;
  user?: User;
  organizations?: Organization[];
  currentOrganizationId?: string;
  signOutSlot?: ReactNode;
  children: ReactNode;
}) {
  const ctx = await getCurrentContext();
  const resolvedWorkspace =
    workspace ??
    (ctx
      ? {
          name: ctx.current.organizationName,
          sub: ctx.current.role,
        }
      : undefined);
  const resolvedUser =
    user ??
    (ctx
      ? {
          name: ctx.user.name ?? "Il tuo account",
          email: ctx.user.email ?? undefined,
          initials:
            (ctx.user.name ?? ctx.user.email ?? "N")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "N",
        }
      : undefined);
  const resolvedOrganizations = ctx?.organizations ?? [];
  const resolvedCurrentOrganizationId = ctx?.current.organizationId;

  return (
    <div className="text-foreground flex min-h-screen flex-col bg-[var(--brand-avorio)]">
      <a
        href="#main-content"
        className="bg-card text-foreground focus:ring-ring sr-only rounded-md px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:ring-2"
      >
        Salta al contenuto
      </a>
      <TopNav
        active={active}
        workspace={resolvedWorkspace}
        user={resolvedUser}
        organizations={resolvedOrganizations}
        currentOrganizationId={resolvedCurrentOrganizationId}
        signOutSlot={signOutSlot}
      />
      {/* Sotto-barra: breadcrumb + azioni della pagina. Slim, così il contenuto guadagna spazio. */}
      <div className="border-b border-[var(--brand-hairline)]/70 bg-[var(--brand-avorio)]/60">
        <div className="mx-auto flex h-12 max-w-[1320px] items-center gap-3 px-4 lg:px-6">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-[13px]">
            {breadcrumb ?? <ShellBreadcrumb />}
          </div>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {/* ⌘K Command Palette: overlay globale presente su OGNI pagina autenticata. */}
      <CommandPalette />
    </div>
  );
}

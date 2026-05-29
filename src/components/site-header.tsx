import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

// Header sticky per le pagine autenticate. `actions` accoglie slot a destra
// (es. menu organizzazione, logout) renderizzati dal chiamante.
export function SiteHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2"
        >
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

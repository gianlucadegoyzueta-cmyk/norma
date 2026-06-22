"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { MOBILE_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { COMMAND_OPEN_EVENT } from "./command-palette";

/**
 * Barra di navigazione mobile (solo < md): 4 sezioni chiave + FAB "concierge" che apre la ⌘K.
 * Fissa in fondo, rispetta la safe-area iOS. Il padding del contenuto è gestito in globals.css
 * (`body:has([data-mobile-nav]) main`) così non serve toccare ogni pagina.
 */
export function MobileNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      data-mobile-nav
      aria-label="Navigazione principale"
      className="border-border bg-background/90 supports-[backdrop-filter]:bg-background/75 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-stretch justify-around px-2">
        {MOBILE_SECTIONS.slice(0, 2).map((s) => (
          <NavItem key={s.href} section={s} active={isActive(s.href)} />
        ))}

        {/* FAB concierge centrale: apre la command palette. */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(COMMAND_OPEN_EVENT))}
            aria-label="Comandi rapidi"
            className="bg-primary text-primary-foreground focus-visible:ring-ring -mt-5 flex size-14 items-center justify-center rounded-full shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Sparkles className="size-6" aria-hidden />
          </button>
        </div>

        {MOBILE_SECTIONS.slice(2, 4).map((s) => (
          <NavItem key={s.href} section={s} active={isActive(s.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  section,
  active,
}: {
  section: (typeof MOBILE_SECTIONS)[number];
  active: boolean;
}) {
  const { href, label, Icon } = section;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

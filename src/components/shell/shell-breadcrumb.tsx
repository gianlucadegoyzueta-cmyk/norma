"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { matchActive } from "./shell-nav";

// Breadcrumb di default della topbar: "Norma › <sezione>", derivata dal pathname.
export function ShellBreadcrumb() {
  const pathname = usePathname() ?? "";
  const item = matchActive(pathname);
  return (
    <>
      <span className="text-foreground/70">Norma</span>
      {item && (
        <>
          <ChevronRight className="text-muted-foreground/50 size-3.5" />
          <span className="text-foreground font-medium">{item.label}</span>
        </>
      )}
    </>
  );
}

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";

type Workspace = { name: string; sub?: string };
type User = { name: string; email?: string; initials: string };

// Cassetto di navigazione mobile (<lg): un hamburger nella topbar apre la AppSidebar come
// pannello a scomparsa da sinistra, con backdrop. Riusa AppSidebar 1:1 (stessa nav, stesso
// stato attivo, stesso footer). Pattern overlay/scroll-lock/Esc/focus ricalcato da
// CommandPalette, esteso con focus-trap e restore-focus. Su desktop (>=lg) non rende nulla.
//
// NB: l'overlay è montato via portal su document.body. La topbar ha `backdrop-blur`, e
// `backdrop-filter` crea un containing block per i `position: fixed` discendenti: senza il
// portal il cassetto resterebbe intrappolato nell'altezza dell'header (64px) invece di
// coprire l'intera viewport.
export function MobileSidebarDrawer({
  active,
  workspace,
  user,
  className,
}: {
  active?: string;
  workspace?: Workspace;
  user?: User;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [slidIn, setSlidIn] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const drawerId = React.useId();

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => setMounted(true), []);

  // Chiude il cassetto a ogni cambio di rotta (oltre all'onNavigate dei link).
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // All'apertura: blocca lo scroll del body, gestisce Esc + focus-trap, dà fuoco alla prima
  // voce e anima lo slide-in; alla chiusura ripristina scroll e fuoco all'hamburger.
  React.useEffect(() => {
    if (!open) {
      setSlidIn(false);
      return;
    }
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    const raf = requestAnimationFrame(() => {
      setSlidIn(true);
      panelRef.current?.querySelector<HTMLElement>("a[href],button:not([disabled])")?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri navigazione"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        className={cn(
          "text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--brand-avorio)]",
          className,
        )}
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
            <div
              className={cn(
                "bg-foreground/30 absolute inset-0 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none",
                slidIn ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
              onMouseDown={close}
            />
            <div
              ref={panelRef}
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label="Navigazione"
              className={cn(
                "absolute inset-y-0 left-0 w-[264px] max-w-[85vw] shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none",
                slidIn ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <AppSidebar
                variant="drawer"
                active={active}
                workspace={workspace}
                user={user}
                onNavigate={close}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

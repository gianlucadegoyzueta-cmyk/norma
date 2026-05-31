"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#prodotti", label: "Prodotti" },
  { href: "#funzionalita", label: "Funzionalità" },
  { href: "#come-funziona", label: "Come funziona" },
  { href: "#prezzi", label: "Prezzi" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2"
        >
          <Brand />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Accedi
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Prova gratis
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="hover:bg-accent focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-2"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-border/60 bg-background border-t md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
                Accedi
              </Link>
              <Link href="/login" className={cn(buttonVariants(), "flex-1")}>
                Prova gratis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

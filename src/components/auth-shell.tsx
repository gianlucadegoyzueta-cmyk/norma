import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Cornice condivisa delle pagine di autenticazione: centratura, brand cliccabile, toggle tema e
 * uno sfondo decorativo MOLTO sobrio (coerente con lo stile pulito/fiducioso). Nessuna logica.
 */
export function AuthShell({
  children,
  width = "sm",
}: {
  children: React.ReactNode;
  width?: "sm" | "md";
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      {/* Velo radiale appena percettibile: profondità senza gridare. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_40%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent)]"
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className={cn("w-full", width === "sm" ? "max-w-sm" : "max-w-md")}>
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Brand />
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}

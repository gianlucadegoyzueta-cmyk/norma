import Link from "next/link";
import { Brand } from "@/components/brand";
import { SealMark } from "@/components/ui/seal-mark";
import { cn } from "@/lib/utils";

/**
 * Cornice condivisa delle pagine di autenticazione (login, signup, recupero password, errore).
 * Stessa "carta" del resto del prodotto — grana appena percettibile e sigillo guilloche in
 * filigrana dietro il marchio — ma SENZA il chrome dell'app interna (niente «torna alla
 * dashboard», niente barra). Tutto in token semantici, così resta corretta anche in dark mode.
 * Nessuna logica.
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
      {/* Grana di carta: rumore frattale tinto col foreground, opacità minima → si adatta al tema. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.5] mix-blend-multiply"
      >
        <filter id="auth-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.13 0 0 0 0 0.11 0 0 0 0 0.08 0 0 0 0.04 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#auth-grain)" />
      </svg>

      {/* Velo radiale appena percettibile: profondità senza gridare. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_40%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent)]"
      />

      {/* Sigillo guilloche in filigrana dietro il marchio: firma del brand, quasi impercettibile. */}
      <div
        aria-hidden
        className="text-foreground pointer-events-none absolute top-[8%] left-1/2 -z-10 -translate-x-1/2 opacity-[0.04]"
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="size-[340px]"
        >
          <circle cx="100" cy="100" r="96" />
          <circle cx="100" cy="100" r="88" strokeDasharray="1 3" />
          <circle cx="100" cy="100" r="78" strokeDasharray="6 4" />
          <circle cx="100" cy="100" r="66" strokeDasharray="1 2" />
          <circle cx="100" cy="100" r="55" />
          <circle cx="100" cy="100" r="44" strokeDasharray="8 3" />
          <circle cx="100" cy="100" r="34" strokeDasharray="1 5" />
          <circle cx="100" cy="100" r="24" strokeDasharray="1 5" />
        </svg>
      </div>

      <div className={cn("w-full", width === "sm" ? "max-w-sm" : "max-w-md")}>
        <div className="mb-7 flex flex-col items-center gap-3">
          <Link
            href="/"
            className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Brand />
          </Link>
          <span className="text-muted-foreground/80 text-[10.5px] font-medium tracking-[0.22em] uppercase">
            Conformità affitti brevi
          </span>
        </div>
        {children}
        <p className="text-muted-foreground/70 mt-7 flex items-center justify-center gap-1.5 text-center text-xs">
          <SealMark className="size-3.5 shrink-0 opacity-70" />
          Dati cifrati · conforme GDPR · server in UE
        </p>
      </div>
    </main>
  );
}

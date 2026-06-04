import { SealMark } from "@/components/ui/seal-mark";
import { cn } from "@/lib/utils";

/**
 * Marchio Norma applicato in tutta l'app (header, auth, onboarding, not-found…).
 * Logo ufficiale: sigillo-monogramma (`SealMark`) in terracotta + wordmark "Norma" in serif
 * Fraunces (`font-display`), coerente con il sito marketing.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight",
        className,
      )}
    >
      <SealMark className="text-primary size-8 shrink-0" />
      <span className="text-foreground">
        Norma
        <span className="text-muted-foreground ml-1.5 font-sans text-sm font-medium">
          · Affitti Brevi
        </span>
      </span>
    </span>
  );
}

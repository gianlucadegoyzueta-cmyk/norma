import { cn } from "@/lib/utils";

/**
 * Spinner puramente CSS (nessuna dipendenza). `aria-label` lo annuncia agli screen reader;
 * usa `currentColor`, quindi eredita il colore del contesto (es. dentro un Button).
 */
export function Spinner({
  className,
  label = "Caricamento…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        // Con prefers-reduced-motion rallenta molto la rotazione (resta un feedback di attività,
        // senza il vortice rapido che dà fastidio a chi ha disattivato le animazioni).
        "motion-reduce:[animation-duration:2.4s]",
        className,
      )}
    />
  );
}

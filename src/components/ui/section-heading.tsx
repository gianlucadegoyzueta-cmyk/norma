import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Intestazione di sezione coerente: piccolo titolo serif (Fraunces) — più "editoriale" della
 * vecchia etichetta grigia minuscola, ma sempre con misura. Uniforma i vari h2 di sezione.
 */
export function SectionHeading({
  children,
  as: As = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <As
      className={cn(
        "font-display text-foreground mb-3 text-base font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </As>
  );
}

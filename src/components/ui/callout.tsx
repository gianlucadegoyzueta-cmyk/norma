import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Messaggio "calmo" inline (info/success/warning/destructive): un solo componente al posto dei vari
 * box d'avviso fatti a mano. Tono editoriale, leggibile, con icona facoltativa. Usato per spiegare,
 * rassicurare o segnalare — mai per allarmare gratuitamente.
 */
export type CalloutTone = "info" | "success" | "warning" | "destructive";

const TONES: Record<CalloutTone, string> = {
  info: "border-primary/25 bg-primary/5",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/40 bg-warning/10",
  destructive: "border-destructive/30 bg-destructive/8",
};

export function Callout({
  tone = "info",
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role="note" className={cn("rounded-lg border px-4 py-3 text-sm", TONES[tone], className)}>
      <div className="flex gap-3">
        {Icon ? <Icon className="text-foreground/70 mt-0.5 size-4 shrink-0" aria-hidden /> : null}
        <div className="min-w-0 space-y-1">
          {title ? <p className="text-foreground font-medium">{title}</p> : null}
          {children ? (
            <div className="text-muted-foreground [&_strong]:text-foreground [&_strong]:font-medium">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Intestazione di pagina coerente in tutta l'app: titolo serif (Fraunces) "con misura", descrizione
 * facoltativa, slot azioni a destra e link "indietro" facoltativo. Uniforma i mille `<h1>` ad-hoc.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Indietro",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-3 inline-flex items-center gap-1 rounded text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

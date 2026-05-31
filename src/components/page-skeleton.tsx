import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

/**
 * Scheletro generico per le rotte che caricano dati (loading.tsx): mantiene l'intestazione e
 * accenna al layout (titolo + righe), così la transizione non "salta". `aria-busy` annuncia lo stato.
 */
export function PageSkeleton({
  rows = 4,
  maxWidth = "max-w-3xl",
}: {
  rows?: number;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main
        aria-busy
        aria-label="Caricamento in corso"
        className={cn("mx-auto w-full px-4 py-8 sm:px-6 sm:py-10", maxWidth)}
      >
        <Skeleton className="mb-6 h-4 w-24" />
        <Skeleton className="mb-3 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-full max-w-prose" />
        <div className="grid gap-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
}

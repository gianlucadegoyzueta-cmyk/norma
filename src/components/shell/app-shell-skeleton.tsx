import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/skeleton";

// Scheletro di caricamento montato DENTRO l'AppShell: sidebar + topbar compaiono subito
// (la sezione attiva è evidenziata via pathname), così la transizione verso la pagina
// caricata non "salta" più tra chrome diverse. Contenuto accennato (testata + righe).
export function AppShellSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <AppShell>
      <div
        aria-busy
        aria-label="Caricamento in corso"
        className="mx-auto w-full max-w-[1140px] px-6 py-8 sm:px-10"
      >
        <Skeleton className="mb-4 h-4 w-28" />
        <Skeleton className="mb-3 h-10 w-64" />
        <Skeleton className="mb-10 h-5 w-full max-w-prose" />
        <div className="grid gap-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

import { cn } from "@/lib/utils";

/** Blocco scheletro animato (placeholder di caricamento). Decorativo → aria-hidden. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-muted animate-pulse rounded-md", className)} />;
}

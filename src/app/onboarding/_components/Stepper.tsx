import { cn } from "@/lib/utils";

export const WIZARD_LABELS = ["Benvenuto", "La tua attività", "Alloggiati", "Immobile", "Pronto"];

/** Indicatore di avanzamento del wizard. Accessibile: passo corrente annunciato, pallini decorativi. */
export function Stepper({ current }: { current: number }) {
  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Passo {Math.min(current + 1, WIZARD_LABELS.length)} di {WIZARD_LABELS.length}:{" "}
        {WIZARD_LABELS[current]}
      </p>
      <ol aria-hidden className="flex items-center gap-1.5">
        {WIZARD_LABELS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && "border-primary text-primary border-2",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < WIZARD_LABELS.length - 1 && (
                <span
                  className={cn(
                    "mx-0.5 h-px w-3 transition-colors duration-500 sm:w-5",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

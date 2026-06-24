import { cn } from "@/lib/utils";

/**
 * Toggle accessibile (ARIA switch). Controllato: `checked` + `onCheckedChange`. Stile a brand
 * (terracotta acceso / hairline spento). Presentazionale: la logica sta nel componente client
 * che lo usa.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-visible:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "bg-card inline-block size-5 rounded-full shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

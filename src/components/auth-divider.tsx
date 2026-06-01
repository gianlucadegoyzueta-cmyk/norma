/** Separatore "oppure" tra metodi di accesso. Decorativo (le linee sono aria-hidden). */
export function AuthDivider({ label = "oppure" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span aria-hidden className="bg-border h-px flex-1" />
    </div>
  );
}

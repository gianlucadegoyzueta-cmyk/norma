import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Campo di form accessibile: label collegata, suggerimento opzionale ed errore inline.
 * Il controllo va passato come children; collega tu `aria-describedby={describedById(...)}`
 * e `aria-invalid` usando l'`id` del campo, così lo screen reader legge hint/errore.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Costruisce il valore di `aria-describedby` per un campo, includendo solo i frammenti presenti. */
export function describedById(
  id: string,
  opts: { hint?: boolean; error?: boolean },
): string | undefined {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/**
 * Messaggio a livello di form (errore o successo), con `aria-live` per l'annuncio dinamico.
 * Restituisce null se non c'è contenuto, così si può renderizzare sempre senza condizionali sparsi.
 */
export function FormMessage({
  children,
  variant = "error",
}: {
  children?: React.ReactNode;
  variant?: "error" | "success";
}) {
  if (!children) return null;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
      )}
    >
      {children}
    </div>
  );
}

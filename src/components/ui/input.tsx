import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors duration-150 ease-[var(--ease-brand)] motion-reduce:transition-none",
        "placeholder:text-muted-foreground",
        "hover:border-foreground/25",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Stato di errore: bordo e anello rossi quando aria-invalid; resta rosso anche in focus
        // (sovrascrive border-ring) così l'errore non "sparisce" mentre si digita.
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        "disabled:hover:border-input disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

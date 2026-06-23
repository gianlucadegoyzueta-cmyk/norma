import * as React from "react";
import { cn } from "@/lib/utils";

// Select nativo stilizzato: nessuna dipendenza extra, accessibile di default.
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        // text-base (16px) su mobile, text-sm (14px) da md in su: sotto i 16px iOS Safari fa
        // auto-zoom alla messa a fuoco. Coerente con Input; vale per le tendine del check-in mobile.
        "border-input bg-background text-foreground flex h-10 w-full appearance-none rounded-md border px-3 py-2 text-base shadow-sm transition-colors duration-150 ease-[var(--ease-brand)] motion-reduce:transition-none md:text-sm",
        "hover:border-foreground/25",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Stato di errore coerente con Input: bordo e anello rossi quando aria-invalid, e resta
        // rosso anche in focus (sovrascrive border-ring).
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        "disabled:hover:border-input disabled:cursor-not-allowed disabled:opacity-50",
        // Freccia custom via background image: stroke con l'inchiostro-soft di brand (#5b5347)
        // invece di un grigio generico, così resta coerente col tema "carta" e ha contrasto AA.
        "bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%235b5347%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')]",
        className,
      )}
      {...props}
    />
  );
}

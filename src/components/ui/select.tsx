import * as React from "react";
import { cn } from "@/lib/utils";

// Select nativo stilizzato: nessuna dipendenza extra, accessibile di default.
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "border-input bg-background flex h-10 w-full appearance-none rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Freccia custom via background image.
        "bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22gray%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')]",
        className,
      )}
      {...props}
    />
  );
}

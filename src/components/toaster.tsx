"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster dell'app: feedback calmo e sobrio delle azioni (conferme, errori). In alto al centro
 * così è visibile anche da telefono senza coprire i bottoni. Stile coerente coi token di Norma.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-card text-card-foreground shadow-overlay text-sm",
          title: "font-medium text-foreground",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          icon: "text-muted-foreground",
        },
      }}
    />
  );
}

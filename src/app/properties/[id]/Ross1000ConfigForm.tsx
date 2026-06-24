"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updatePropertyRoss1000Action } from "../actions";

type Result = { ok: boolean; message: string };

/**
 * Form della configurazione ricettiva Ross1000 (codice struttura + camere/letti). Sono i dati
 * STRUTTURA richiesti dal movimento turistico ISTAT: senza, `/istat` segna la struttura INCOMPLETE.
 * È il bersaglio del deep-link `/properties/{id}#ricettiva` dalla pagina ISTAT.
 */
export function Ross1000ConfigForm({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: {
    ross1000Code: string | null;
    camereDisponibili: number | null;
    lettiDisponibili: number | null;
  };
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    updatePropertyRoss1000Action,
    null,
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-muted-foreground text-xs">Codice struttura (Ross1000)</span>
          <Input
            name="ross1000Code"
            defaultValue={initial.ross1000Code ?? ""}
            placeholder="es. 012345678"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground text-xs">Camere disponibili</span>
          <Input
            name="camereDisponibili"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={initial.camereDisponibili ?? ""}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground text-xs">Letti disponibili</span>
          <Input
            name="lettiDisponibili"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={initial.lettiDisponibili ?? ""}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? "Salvataggio…" : "Salva configurazione"}
        </Button>
        {state ? (
          <p
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              state.ok ? "text-success" : "text-destructive",
            )}
          >
            {state.ok ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="size-3.5 shrink-0" aria-hidden />
            )}
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

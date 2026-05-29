"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createStayAction } from "./actions";

type Property = {
  id: string;
  name: string;
  comuneName: string;
  provincia: string;
  hasCredential: boolean;
};
type Result = { ok: boolean; message: string };

export function StayForm({ properties }: { properties: Property[] }) {
  const [state, action, pending] = useActionState<Result | null, FormData>(createStayAction, null);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");

  const selected = properties.find((p) => p.id === propertyId) ?? null;
  const noCredential = selected !== null && !selected.hasCredential;

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="propertyId">Immobile</Label>
        <Select
          id="propertyId"
          name="propertyId"
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.comuneName} ({p.provincia})
            </option>
          ))}
        </Select>
        {noCredential && (
          <p className="text-warning-foreground dark:text-warning text-xs">
            Questo immobile non è collegato a una credenziale Alloggiati: potrai creare il soggiorno
            ma non generare le schedine finché non lo colleghi.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="arrivalDate">Data di arrivo</Label>
          <Input id="arrivalDate" name="arrivalDate" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="departureDate">Data di partenza (opzionale)</Label>
          <Input id="departureDate" name="departureDate" type="date" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="guestsCount">Numero ospiti</Label>
          <Input
            id="guestsCount"
            name="guestsCount"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input type="checkbox" name="isShortStay" className="size-4 rounded border" />
          Soggiorno breve (≤24h)
        </label>
      </div>

      <p className="text-muted-foreground text-xs">
        Alloggiati accetta solo arrivi di <strong>oggi o ieri</strong> (fuso Italia). Le schedine si
        generano dopo aver aggiunto gli ospiti.
      </p>

      <Button type="submit" disabled={pending} className="mt-1 w-fit">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Creazione…" : "Crea soggiorno"}
      </Button>

      {state && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            state.ok ? "text-success" : "text-destructive",
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <XCircle className="size-4 shrink-0" />
          )}
          {state.message}
        </p>
      )}
    </form>
  );
}

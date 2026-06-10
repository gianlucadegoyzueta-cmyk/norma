"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addImportAction } from "./actions";

type Result = { ok: boolean; message: string };

export function AddICalForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState<Result | null, FormData>(addImportAction, null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid gap-2">
        <Label htmlFor="url">URL del calendario iCal</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://www.airbnb.it/calendar/ical/…"
        />
        <p className="text-muted-foreground text-xs">
          Su Airbnb: Calendario → Disponibilità → «Esporta calendario». Su Booking.com: Calendario →
          «Esporta». Incolla qui il link.
        </p>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Collegamento…" : "Collega calendario"}
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

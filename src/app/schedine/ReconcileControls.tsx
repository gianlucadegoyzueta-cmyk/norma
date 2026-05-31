"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { reconcileCredentialAction } from "./actions";

type Result = { ok: boolean; message: string };

/**
 * Riconciliazione T+1 per schedine UNVERIFIED: scarica la Ricevuta del giorno indicato
 * (default: ieri) e aggiorna gli stati senza re-inviare alla cieca.
 */
export function ReconcileControls({
  credentialId,
  unverifiedCount,
  active,
  defaultReceiptDate,
}: {
  credentialId: string;
  unverifiedCount: number;
  active: boolean;
  /** Ieri in fuso Rome (YYYY-MM-DD), calcolato server-side. */
  defaultReceiptDate: string;
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    reconcileCredentialAction,
    null,
  );

  if (unverifiedCount === 0) return null;

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="credentialId" value={credentialId} />
      <p className="text-muted-foreground text-xs">
        {unverifiedCount} schedina/e con esito ignoto: confronta con la Ricevuta Alloggiati del
        giorno dell&apos;invio (solo giorni passati).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`receipt-${credentialId}`} className="text-xs">
            Data ricevuta
          </Label>
          <Input
            id={`receipt-${credentialId}`}
            name="receiptDate"
            type="date"
            defaultValue={defaultReceiptDate}
            className="w-auto"
            disabled={!active || pending}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={!active || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {pending ? "Riconcilia…" : "Riconcilia (T+1)"}
        </Button>
      </div>
      {!active && (
        <p className="text-muted-foreground text-xs">Credenziale non ATTIVA: riconciliazione disabilitata.</p>
      )}
      {state && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            state.ok ? "text-success" : "text-destructive",
          )}
        >
          {state.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {state.message}
        </p>
      )}
    </form>
  );
}

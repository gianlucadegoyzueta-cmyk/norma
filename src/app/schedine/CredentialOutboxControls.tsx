"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendCredentialAction, verifyCredentialAction } from "./actions";

type Result = { ok: boolean; message: string };

function Feedback({ state }: { state: Result | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        state.ok ? "text-success" : "text-destructive",
      )}
    >
      {state.ok ? (
        <CheckCircle2 className="size-3.5 shrink-0" />
      ) : (
        <XCircle className="size-3.5 shrink-0" />
      )}
      {state.message}
    </p>
  );
}

/**
 * Controlli di invio per UNA credenziale: prima "Verifica" (Test, sicuro), poi "Invia" (Send,
 * IRREVERSIBILE) dietro conferma esplicita. Due flussi separati con feedback indipendente.
 */
export function CredentialOutboxControls({
  credentialId,
  pendingCount,
  active,
}: {
  credentialId: string;
  pendingCount: number;
  active: boolean;
}) {
  const [verifyState, verifyAction, verifying] = useActionState<Result | null, FormData>(
    verifyCredentialAction,
    null,
  );
  const [sendState, sendAction, sending] = useActionState<Result | null, FormData>(
    sendCredentialAction,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  if (!active) {
    return (
      <p className="text-muted-foreground text-xs">
        Credenziale non ATTIVA: verificala in “Credenziali” per poter inviare.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={verifyAction}>
          <input type="hidden" name="credentialId" value={credentialId} />
          <Button type="submit" variant="outline" size="sm" disabled={verifying || sending}>
            {verifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {verifying ? "Verifica…" : "Verifica (Test)"}
          </Button>
        </form>

        {!confirming ? (
          <Button type="button" size="sm" disabled={sending} onClick={() => setConfirming(true)}>
            <Send />
            Invia {pendingCount}…
          </Button>
        ) : (
          <form action={sendAction} className="flex items-center gap-2">
            <input type="hidden" name="credentialId" value={credentialId} />
            <input type="hidden" name="confirm" value="yes" />
            <Button type="submit" size="sm" variant="destructive" disabled={sending}>
              {sending ? <Loader2 className="animate-spin" /> : <AlertTriangle />}
              {sending ? "Invio…" : `Conferma invio irreversibile di ${pendingCount}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={sending}
              onClick={() => setConfirming(false)}
            >
              Annulla
            </Button>
          </form>
        )}
      </div>

      {confirming && !sendState && (
        <p className="text-muted-foreground text-xs">
          L&apos;invio è <strong>irreversibile</strong>: una schedina acquisita non può essere
          cancellata. Verifica prima con “Test”.
        </p>
      )}
      <Feedback state={verifyState} />
      <Feedback state={sendState} />
    </div>
  );
}

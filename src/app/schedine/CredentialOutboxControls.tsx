"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendCredentialAction, verifyCredentialAction } from "./actions";
import type { OutboxResult, SendResult, SendSummary } from "./types";

function Feedback({ state }: { state: OutboxResult | null }) {
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
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <XCircle className="size-3.5 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  );
}

/** Riepilogo riga-per-riga dell'invio: conteggi per esito (token) + dettaglio delle respinte. */
function SendSummaryView({ summary }: { summary: SendSummary }) {
  const { acquired, rejected, unverified, rejectedRows } = summary;
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border grid gap-2 rounded-md border p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
        {acquired > 0 && (
          <span className="text-success inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            {acquired} {acquired === 1 ? "acquisita" : "acquisite"}
          </span>
        )}
        {rejected > 0 && (
          <span className="text-destructive inline-flex items-center gap-1">
            <XCircle className="size-3.5 shrink-0" aria-hidden />
            {rejected} {rejected === 1 ? "respinta" : "respinte"}
          </span>
        )}
        {unverified > 0 && (
          <span className="text-warning-foreground dark:text-warning inline-flex items-center gap-1">
            <span aria-hidden>⏳</span>
            {unverified} da verificare
          </span>
        )}
      </div>

      {rejectedRows.length > 0 && (
        <ul className="grid gap-1 border-t pt-2">
          {rejectedRows.map((r, i) => (
            <li key={i} className="text-xs">
              <span className="text-foreground font-medium">{r.guestName}</span>
              {r.errorCod ? <span className="text-muted-foreground"> [{r.errorCod}]</span> : null}
              <span className="text-destructive"> · {r.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Controlli di invio per UNA credenziale: prima "Verifica" (Test, sicuro), poi "Invia" (Send,
 * IRREVERSIBILE) dietro conferma esplicita. Due flussi separati con feedback indipendente.
 * Dopo l'invio si mostra il riepilogo per esito (acquisite / respinte / da verificare).
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
  const [verifyState, verifyAction, verifying] = useActionState<OutboxResult | null, FormData>(
    verifyCredentialAction,
    null,
  );
  const [sendState, sendAction, sending] = useActionState<SendResult | null, FormData>(
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
            {verifying ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
            {verifying ? "Verifica…" : "Verifica (Test)"}
          </Button>
        </form>

        {!confirming ? (
          <Button type="button" size="sm" disabled={sending} onClick={() => setConfirming(true)}>
            <Send aria-hidden />
            Invia {pendingCount}…
          </Button>
        ) : (
          <form action={sendAction} className="flex items-center gap-2">
            <input type="hidden" name="credentialId" value={credentialId} />
            <input type="hidden" name="confirm" value="yes" />
            <Button type="submit" size="sm" variant="destructive" disabled={sending}>
              {sending ? <Loader2 className="animate-spin" aria-hidden /> : <AlertTriangle aria-hidden />}
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
      {/* Esito invio: riepilogo ricco se disponibile, altrimenti messaggio semplice (errore/no-op). */}
      {sendState?.summary ? (
        <SendSummaryView summary={sendState.summary} />
      ) : (
        <Feedback state={sendState} />
      )}
    </div>
  );
}

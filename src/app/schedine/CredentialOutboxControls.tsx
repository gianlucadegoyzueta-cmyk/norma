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
  const [acknowledged, setAcknowledged] = useState(false);
  // "Test eseguito con esito positivo" nella sessione corrente: abbassa l'attrito sulla conferma.
  const testedOk = verifyState?.ok === true;
  const ackId = `ack-${credentialId}`;

  if (!active) {
    return (
      <p className="text-muted-foreground text-xs">
        Credenziale non ATTIVA: verificala in “Credenziali” per poter inviare.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <form action={verifyAction} className="w-full sm:w-auto">
          <input type="hidden" name="credentialId" value={credentialId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={verifying || sending}
            className="w-full sm:w-auto"
          >
            {verifying ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
            {verifying ? "Verifica…" : "Verifica (Test)"}
          </Button>
        </form>

        {!confirming && (
          <Button
            type="button"
            size="sm"
            disabled={sending}
            onClick={() => setConfirming(true)}
            className="w-full sm:w-auto"
          >
            <Send aria-hidden />
            Invia {pendingCount}…
          </Button>
        )}
      </div>

      {confirming && (
        <div className="border-border grid gap-2 rounded-md border p-3">
          <p className="text-muted-foreground text-xs">
            Invio <strong>irreversibile</strong> di {pendingCount}{" "}
            {pendingCount === 1 ? "schedina" : "schedine"}: una volta acquisita non può essere
            cancellata.
          </p>

          {/* Error-prevention: senza un Test positivo in sessione, alziamo l'attrito (checkbox
              obbligatoria), senza bloccare del tutto (il Test può fallire per rete). */}
          {!testedOk && (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="accent-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 focus-visible:ring-2 focus-visible:ring-offset-1"
                aria-describedby={ackId}
              />
              <span id={ackId}>
                <strong className="text-warning-foreground dark:text-warning">
                  Test non eseguito
                </strong>{" "}
                in questa sessione. Consigliato: prima “Verifica (Test)”. Confermo di voler inviare
                comunque.
              </span>
            </label>
          )}

          <form
            action={sendAction}
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <input type="hidden" name="credentialId" value={credentialId} />
            <input type="hidden" name="confirm" value="yes" />
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={sending || (!testedOk && !acknowledged)}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <AlertTriangle aria-hidden />
              )}
              {sending ? "Invio…" : "Conferma invio"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={sending}
              onClick={() => {
                setConfirming(false);
                setAcknowledged(false);
              }}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
          </form>
        </div>
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

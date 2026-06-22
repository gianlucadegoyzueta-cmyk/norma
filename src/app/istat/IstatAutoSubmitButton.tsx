import { Button } from "@/components/ui/button";

/**
 * Affordance "Invia al portale" per l'ISTAT AUTO. È SEMPRE disabilitata: l'invio reale a un ente è
 * una decisione umana esplicita (guardrail #1) e nessun canale regionale è ancora operativo. Il bottone
 * esiste per rendere visibile la capacità in arrivo e spiegare, in chiaro, perché oggi non parte.
 *
 * `ready` decide solo il TONO del messaggio (pronto-ma-gated vs completa-prima-i-dati): in nessun caso
 * il click invia qualcosa. Presentazionale → server component. A11y: il bottone è realmente disabilitato
 * (aria-disabled) e l'hint è collegato via aria-describedby così lo screen reader spiega il perché.
 */
export function IstatAutoSubmitButton({ ready, hintId }: { ready: boolean; hintId: string }) {
  const hint = ready
    ? "Invio automatico in arrivo. Per ora scarica il file e caricalo tu sul portale: l'invio diretto richiede l'autorizzazione esplicita dell'host."
    : "Completa prima i dati mancanti: senza i campi obbligatori del tracciato non c'è nulla da inviare.";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        aria-disabled="true"
        aria-describedby={hintId}
        title={hint}
      >
        Invia al portale
      </Button>
      <p id={hintId} className="text-muted-foreground max-w-[18rem] text-right text-xs">
        {hint}
      </p>
    </div>
  );
}

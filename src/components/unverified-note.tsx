import { cn } from "@/lib/utils";

/**
 * Nota esplicativa per le schedine UNVERIFIED ("Da verificare"). Usa una disclosure NATIVA
 * (<details>/<summary>): accessibile da tastiera senza JS. Tono rassicurante e, soprattutto,
 * scoraggia il re-invio manuale (rischio doppione) — coerente con la riconciliazione T+1.
 *
 * Server component: nessuna interattività oltre a quella nativa dell'elemento.
 */
export function UnverifiedNote({ className }: { className?: string }) {
  return (
    <details className={cn("text-xs", className)}>
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex cursor-pointer items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-1">
        <span aria-hidden>ⓘ</span>
        Perché «da verificare»?
      </summary>
      <p className="text-muted-foreground mt-1 max-w-prose leading-relaxed">
        Inviata, ma l&apos;esito non è ancora confermato dal portale. Verrà verificata{" "}
        <strong className="text-foreground font-medium">automaticamente</strong> (riconciliazione
        T+1). <strong className="text-foreground font-medium">Non re-inviarla</strong>: rischieresti
        un doppione non eliminabile.
      </p>
    </details>
  );
}

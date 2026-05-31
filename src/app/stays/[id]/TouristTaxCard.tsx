import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EstimateOutcome } from "@/server/modules/tourist-tax/services/estimate.service";
import { formatEuroCents } from "@/server/modules/tourist-tax/services/estimate.service";

export interface GuestLabel {
  id: string;
  name: string;
}

/**
 * Scheda "Imposta di soggiorno (stima)" per un soggiorno. Presentazione pura: riceve l'esito
 * già calcolato. Mostra totale + dettaglio per ospite (esente/ridotto + motivo); se manca la
 * regola del comune mostra uno stato esplicito invece di un numero potenzialmente errato.
 */
export function TouristTaxCard({
  outcome,
  guestLabels,
  comuneName,
}: {
  outcome: EstimateOutcome;
  guestLabels: GuestLabel[];
  comuneName: string;
}) {
  if (outcome.kind === "NO_RULE") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Imposta di soggiorno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            <p className="text-foreground font-medium">Regola non disponibile per {comuneName}</p>
            <p className="mt-1">
              Non è ancora configurata una tariffa dell&apos;imposta di soggiorno per questo comune
              alla data del soggiorno. La stima sarà disponibile appena la regola verrà inserita.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { result } = outcome;
  const nameOf = (id: string) => guestLabels.find((g) => g.id === id)?.name ?? "Ospite";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>Imposta di soggiorno</CardTitle>
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight">
              {formatEuroCents(result.totalCents)}
            </div>
            <p className="text-muted-foreground text-xs">totale stimato</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="divide-border/60 divide-y">
          {result.guests.map((g) => (
            <li key={g.guestId} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{nameOf(g.guestId)}</p>
                <p className="text-muted-foreground text-xs">
                  {g.exempt
                    ? (g.reason ?? "Esente")
                    : g.reduced
                      ? `${g.taxedNights} notti · ${g.reason ?? `riduzione ${g.reductionPct}%`}`
                      : `${g.taxedNights} notti tassate`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.exempt && <Badge variant="secondary">Esente</Badge>}
                {g.reduced && <Badge variant="warning">−{g.reductionPct}%</Badge>}
                <span className="text-sm tabular-nums">{formatEuroCents(g.amountCents)}</span>
              </div>
            </li>
          ))}
        </ul>

        {result.notes.length > 0 && (
          <ul className="text-muted-foreground grid gap-1 text-xs">
            {result.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}

        <p className="text-muted-foreground border-border/60 border-t pt-3 text-xs">
          Stima basata sulla regola del comune valida alla data del soggiorno. Le tariffe possono
          variare: verifica sul regolamento comunale prima del versamento.
        </p>
      </CardContent>
    </Card>
  );
}

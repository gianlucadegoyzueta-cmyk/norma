"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { removeImportAction, syncImportAction } from "./actions";

type Result = { ok: boolean; message: string };

export interface ICalImportRowData {
  id: string;
  sourceLabel: string;
  url: string;
  /** Riepilogo dell'ultimo sync, già formattato lato server. */
  lastSync:
    | { kind: "never" }
    | { kind: "ok"; when: string; count: number }
    | { kind: "error"; message: string };
}

export function ICalImportRow({
  propertyId,
  data,
}: {
  propertyId: string;
  data: ICalImportRowData;
}) {
  const [state, syncAction, pending] = useActionState<Result | null, FormData>(
    syncImportAction,
    null,
  );

  return (
    <div className="border-border/60 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{data.sourceLabel}</span>
            {data.lastSync.kind === "error" && (
              <Badge variant="destructive">
                <AlertTriangle className="size-3" />
                Errore
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs" title={data.url}>
            {data.url}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {data.lastSync.kind === "never" && "Mai sincronizzato."}
            {data.lastSync.kind === "ok" &&
              `Ultimo sync ${data.lastSync.when} · ${data.lastSync.count} prenotazioni.`}
            {data.lastSync.kind === "error" && (
              <span className="text-destructive">{data.lastSync.message}</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <form action={syncAction}>
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="importId" value={data.id} />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {pending ? "Sincronizzo…" : "Sincronizza ora"}
            </Button>
          </form>
          <form action={removeImportAction}>
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="importId" value={data.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Rimuovi calendario"
              title="Rimuovi calendario"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      {state && (
        <p
          role="status"
          className={cn(
            "mt-2 flex items-center gap-2 text-sm font-medium",
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
    </div>
  );
}

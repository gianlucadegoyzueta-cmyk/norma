"use client";

import { useActionState } from "react";
import type { CinStatus } from "@prisma/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { CIN_EXPOSURE_REMINDER } from "@/server/modules/cin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { markCinNotRequiredAction, saveCinAction } from "./cin-actions";

type Result = { ok: boolean; message: string };

export function CinInlineForm({
  propertyId,
  cin,
  cinStatus,
}: {
  propertyId: string;
  cin: string | null;
  cinStatus: CinStatus;
}) {
  const [saveState, saveAction, savePending] = useActionState<Result | null, FormData>(
    saveCinAction,
    null,
  );
  const [skipState, skipAction, skipPending] = useActionState<Result | null, FormData>(
    markCinNotRequiredAction,
    null,
  );

  const feedback = saveState ?? skipState;
  const pending = savePending || skipPending;

  if (cinStatus === "OBTAINED" && cin) {
    return (
      <div className="mt-3 border-t pt-3">
        <p className="text-muted-foreground text-xs">
          CIN: <span className="text-foreground font-mono font-medium">{cin}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{CIN_EXPOSURE_REMINDER}</p>
      </div>
    );
  }

  if (cinStatus === "NOT_REQUIRED") {
    return (
      <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
        CIN segnato come non richiesto per questo immobile.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <p className="text-muted-foreground text-xs">
        Ottieni il CIN sul{" "}
        <a
          href="https://bdsr.ministeroturismo.gov.it/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline"
        >
          portale BDSR
        </a>{" "}
        (SPID/CIE) e inseriscilo qui. {CIN_EXPOSURE_REMINDER}
      </p>
      <form action={saveAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="propertyId" value={propertyId} />
        <div className="grid min-w-[12rem] flex-1 gap-1">
          <Label htmlFor={`cin-${propertyId}`} className="text-xs">
            Codice CIN
          </Label>
          <Input
            id={`cin-${propertyId}`}
            name="cin"
            placeholder="IT039007B1XXXXX"
            className="font-mono text-sm uppercase"
            autoComplete="off"
            disabled={pending}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {savePending ? <Loader2 className="size-4 animate-spin" /> : "Salva CIN"}
        </Button>
      </form>
      <form action={skipAction}>
        <input type="hidden" name="propertyId" value={propertyId} />
        <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-xs">
          {skipPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Non richiesto per questo immobile"
          )}
        </Button>
      </form>
      {feedback && (
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            feedback.ok ? "text-success" : "text-destructive",
          )}
        >
          {feedback.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {feedback.message}
        </p>
      )}
    </div>
  );
}

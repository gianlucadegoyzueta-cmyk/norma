"use client";

import { useActionState } from "react";
import { CheckCircle2, FileOutput, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateSchedineAction } from "../actions";

type Result = { ok: boolean; message: string };

export function GenerateSchedineButton({
  stayId,
  disabled,
  disabledReason,
}: {
  stayId: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    generateSchedineAction,
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="stayId" value={stayId} />
      <Button type="submit" disabled={pending || disabled}>
        {pending ? <Loader2 className="animate-spin" /> : <FileOutput />}
        {pending ? "Generazione…" : "Genera schedine"}
      </Button>
      {disabled && disabledReason && (
        <span className="text-muted-foreground text-xs">{disabledReason}</span>
      )}
      {state && (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium",
            state.ok ? "text-success" : "text-destructive",
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <XCircle className="size-4 shrink-0" />
          )}
          {state.message}
        </span>
      )}
    </form>
  );
}

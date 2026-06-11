"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { onboardCredentialAction } from "./actions";

type OnboardResult = { ok: boolean; message: string };

export function CredentialForm() {
  const [state, action, pending] = useActionState<OnboardResult | null, FormData>(
    onboardCredentialAction,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="label">Etichetta</Label>
        <Input id="label" name="label" required placeholder="es. Casa Trastevere" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="category">Tipo credenziale</Label>
          <Select id="category" name="category" defaultValue="SINGOLA">
            <option value="SINGOLA">Struttura singola</option>
            <option value="GESTIONE_APPARTAMENTI">Gestione appartamenti</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="provincia">Provincia (sigla)</Label>
          <Input
            id="provincia"
            name="provincia"
            required
            maxLength={2}
            placeholder="RM"
            className="uppercase"
          />
        </div>
      </div>

      <div className="bg-muted text-muted-foreground my-1 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        Credenziali Alloggiati Web — salvate cifrate nel vault, mai in chiaro.
      </div>

      <div className="grid gap-2">
        <Label htmlFor="utente">Utente</Label>
        <Input id="utente" name="utente" required autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="wskey">WSKey</Label>
          <Input id="wskey" name="wskey" type="password" required autoComplete="off" />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="mt-1 w-fit">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Verifica in corso…" : "Aggiungi e verifica"}
      </Button>

      {state && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            state.ok ? "text-success" : "text-destructive",
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : (
            <XCircle className="size-4 shrink-0" aria-hidden />
          )}
          {state.message}
        </p>
      )}
    </form>
  );
}

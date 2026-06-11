"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createPropertyAction } from "./actions";

type Credential = { id: string; label: string; provincia: string };
type Comune = { id: string; name: string; provincia: string };
type Result = { ok: boolean; message: string };

export function PropertyForm({
  credentials,
  comuni,
}: {
  credentials: Credential[];
  comuni: Comune[];
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    createPropertyAction,
    null,
  );
  // Default: la prima credenziale, così il filtro Comuni è già coerente.
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");

  const provincia = credentials.find((c) => c.id === credentialId)?.provincia ?? null;

  // Quando una credenziale è selezionata, i Comuni sono ristretti alla sua provincia
  // (vincolo Alloggiati). Senza credenziale, mostriamo tutti i Comuni disponibili.
  const visibleComuni = useMemo(
    () => (provincia ? comuni.filter((c) => c.provincia === provincia) : comuni),
    [comuni, provincia],
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome immobile</Label>
        <Input id="name" name="name" required placeholder="es. Bilocale Trastevere" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Indirizzo</Label>
        <Input id="address" name="address" required placeholder="es. Via della Lungaretta 1" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proprietario">Proprietario</Label>
        <Input
          id="proprietario"
          name="proprietario"
          required
          placeholder="Nominativo del proprietario"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="credentialId">Credenziale Alloggiati</Label>
          <Select
            id="credentialId"
            name="credentialId"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
          >
            <option value="">— Nessuna (collego dopo) —</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.provincia}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="comuneId">Comune {provincia ? `(prov. ${provincia})` : ""}</Label>
          <Select id="comuneId" name="comuneId" required defaultValue="" key={provincia ?? "all"}>
            <option value="" disabled>
              {visibleComuni.length === 0 ? "Nessun Comune disponibile" : "Seleziona il Comune"}
            </option>
            {visibleComuni.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.provincia})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {visibleComuni.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Nessun Comune sincronizzato per questa provincia. Sincronizza le tabelle di riferimento
          Alloggiati prima di aggiungere l&apos;immobile.
        </p>
      )}

      <Button type="submit" disabled={pending || visibleComuni.length === 0} className="mt-1 w-fit">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Salvataggio…" : "Aggiungi immobile"}
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

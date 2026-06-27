"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { createWizardPropertyAction } from "../actions";
import { ComuneTypeahead } from "./ComuneTypeahead";

type Credential = { id: string; label: string; provincia: string };
type Comune = { id: string; name: string; provincia: string };

export function FirstPropertyStep({
  onNext,
  onBack,
  credentials,
  comuni,
}: {
  onNext: () => void;
  onBack: () => void;
  credentials: Credential[];
  comuni: Comune[];
}) {
  const [state, action] = useActionState(createWizardPropertyAction, null);
  const advanced = useRef(false);
  useEffect(() => {
    if (state?.ok && !advanced.current) {
      advanced.current = true;
      onNext();
    }
  }, [state, onNext]);

  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const provincia = credentials.find((c) => c.id === credentialId)?.provincia ?? null;

  // Comuni RISTRETTI alla provincia della credenziale: niente errore-dopo.
  const options = useMemo(
    () =>
      comuni
        .filter((c) => !provincia || c.provincia === provincia)
        .map((c) => ({ id: c.id, label: `${c.name} (${c.provincia})` })),
    [comuni, provincia],
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="ob-reveal mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Il tuo primo immobile
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Lo aggancio alla credenziale giusta e restringo i Comuni alla sua provincia: tu scegli
          nome e indirizzo, Norma prepara il resto su mandato.
        </p>
      </header>

      <form action={action} className="grid gap-4">
        {state && !state.ok ? <FormMessage>{state.message}</FormMessage> : null}

        <Field id="ob-pname" label="Nome immobile">
          <Input id="ob-pname" name="name" required placeholder="Bilocale Trastevere" />
        </Field>
        <Field id="ob-paddr" label="Indirizzo">
          <Input id="ob-paddr" name="address" required placeholder="Via della Lungaretta 1" />
        </Field>
        <Field id="ob-pprop" label="Proprietario">
          <Input
            id="ob-pprop"
            name="proprietario"
            required
            placeholder="Nominativo del proprietario"
          />
        </Field>

        <Field id="ob-pcred" label="Credenziale Alloggiati">
          <Select
            id="ob-pcred"
            name="credentialId"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
          >
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.provincia}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-2">
          {options.length === 0 ? (
            <>
              {/* Label senza htmlFor: in questo ramo non c'è un controllo a cui agganciarla. */}
              <span className="text-sm leading-none font-medium">
                Comune {provincia ? `(prov. ${provincia})` : ""}
              </span>
              <p
                id="ob-pcomune-error"
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs"
              >
                Nessun Comune disponibile per questa provincia: prima torna indietro e completa la
                preparazione delle tabelle nello step «Collega Alloggiati». Senza Comune non puoi
                aggiungere l’immobile.
              </p>
            </>
          ) : (
            <>
              <Label htmlFor="ob-pcomune">Comune {provincia ? `(prov. ${provincia})` : ""}</Label>
              <ComuneTypeahead
                id="ob-pcomune"
                name="comuneId"
                options={options}
                required
                placeholder="Cerca il Comune…"
              />
            </>
          )}
        </div>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            Indietro
          </Button>
          <SubmitButton
            className="flex-1"
            pendingLabel="Salvataggio…"
            disabled={options.length === 0}
          >
            Aggiungi immobile
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

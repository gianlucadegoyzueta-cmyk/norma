"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { addGuestPartyAction } from "../actions";
import type { GuestPartyState } from "../types";

type Country = { id: string; name: string };
type Comune = { id: string; name: string; provincia: string };
type DocumentType = { id: string; name: string };
type Option = { id: string; label: string };
type PartyTipo = "SINGOLO" | "FAMIGLIA" | "GRUPPO";

function PersonFields({
  idx,
  withDocument,
  countries,
  comuni,
  luoghi,
  documentTypes,
  errors,
}: {
  idx: number;
  withDocument: boolean;
  countries: Country[];
  comuni: Option[];
  luoghi: Option[];
  documentTypes: DocumentType[];
  errors?: Record<string, string>;
}) {
  const f = (k: string) => `p${idx}.${k}`;
  const err = (k: string) => errors?.[f(k)];
  // Props ARIA + bordo rosso per un campo in errore (il messaggio è collegato via aria-describedby).
  const errProps = (k: string) =>
    err(k)
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `${f(k)}-error`,
          className: "border-destructive",
        }
      : {};
  // Messaggio d'errore del campo: NON role="alert" (annuncio gestito dal riepilogo + focus).
  const fieldError = (k: string) =>
    err(k) ? (
      <p id={`${f(k)}-error`} className="text-destructive text-xs">
        {err(k)}
      </p>
    ) : null;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("lastName")}>Cognome</Label>
          <Input id={f("lastName")} name={f("lastName")} required {...errProps("lastName")} />
          {fieldError("lastName")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("firstName")}>Nome</Label>
          <Input id={f("firstName")} name={f("firstName")} required {...errProps("firstName")} />
          {fieldError("firstName")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("sex")}>Sesso</Label>
          <Select id={f("sex")} name={f("sex")} required defaultValue="" {...errProps("sex")}>
            <option value="" disabled>
              Seleziona
            </option>
            <option value="M">Maschile</option>
            <option value="F">Femminile</option>
          </Select>
          {fieldError("sex")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("birthDate")}>Data di nascita</Label>
          <Input
            id={f("birthDate")}
            name={f("birthDate")}
            type="date"
            required
            {...errProps("birthDate")}
          />
          {fieldError("birthDate")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("birthCountryId")}>Stato di nascita</Label>
          <Select
            id={f("birthCountryId")}
            name={f("birthCountryId")}
            required
            defaultValue=""
            {...errProps("birthCountryId")}
          >
            <option value="" disabled>
              Seleziona
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {fieldError("birthCountryId")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${f("birthComuneId")}-cb`}>Comune di nascita (se in Italia)</Label>
          <ComboBox
            id={`${f("birthComuneId")}-cb`}
            name={f("birthComuneId")}
            options={comuni}
            placeholder="Solo se nato in Italia"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={f("citizenshipId")}>Cittadinanza</Label>
        <Select
          id={f("citizenshipId")}
          name={f("citizenshipId")}
          required
          defaultValue=""
          {...errProps("citizenshipId")}
        >
          <option value="" disabled>
            Seleziona
          </option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {fieldError("citizenshipId")}
      </div>

      {withDocument && (
        <div className="border-border grid gap-3 rounded-md border border-dashed p-3">
          <p className="text-muted-foreground text-xs font-medium">
            Documento (obbligatorio per ospite singolo / capo)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={f("documentTypeId")}>Tipo documento</Label>
              <Select id={f("documentTypeId")} name={f("documentTypeId")} defaultValue="">
                <option value="" disabled>
                  Seleziona
                </option>
                {documentTypes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={f("documentNumber")}>Numero documento</Label>
              <Input id={f("documentNumber")} name={f("documentNumber")} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${f("documentPlaceId")}-cb`}>Luogo di rilascio (Comune o Stato)</Label>
            <ComboBox
              id={`${f("documentPlaceId")}-cb`}
              name={f("documentPlaceId")}
              options={luoghi}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function GuestPartyForm({
  stayId,
  countries,
  comuni,
  documentTypes,
}: {
  stayId: string;
  countries: Country[];
  comuni: Comune[];
  documentTypes: DocumentType[];
}) {
  const [state, action, pending] = useActionState<GuestPartyState | null, FormData>(
    addGuestPartyAction,
    null,
  );
  const [tipo, setTipo] = useState<PartyTipo>("SINGOLO");
  // Numero di MEMBRI extra oltre al capo (solo FAMIGLIA/GRUPPO).
  const [extraMembers, setExtraMembers] = useState(0);

  // Opzioni per le combobox (etichetta univoca con sigla provincia).
  const comuneOptions = useMemo<Option[]>(
    () => comuni.map((c) => ({ id: c.id, label: `${c.name} (${c.provincia})` })),
    [comuni],
  );
  // Luogo di rilascio = Comuni italiani + Stati esteri (resolveLuogoRilascio accetta entrambi).
  const luogoOptions = useMemo<Option[]>(
    () => [...comuneOptions, ...countries.map((c) => ({ id: c.id, label: c.name }))],
    [comuneOptions, countries],
  );

  // Dopo un submit con errori per campo: scroll + focus al PRIMO campo errato (in ordine persona/campo).
  useEffect(() => {
    if (state && !state.ok && state.fieldErrors) {
      const first = Object.keys(state.fieldErrors)[0];
      if (first) {
        const el = document.getElementById(first);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
      }
    }
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const isGroup = tipo !== "SINGOLO";
  const personCount = isGroup ? 1 + extraMembers : 1;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="stayId" value={stayId} />
      <input type="hidden" name="partyTipo" value={tipo} />
      <input type="hidden" name="personCount" value={personCount} />

      {fieldErrors && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state?.message ?? "Controlla i campi evidenziati."} ({Object.keys(fieldErrors).length}{" "}
          {Object.keys(fieldErrors).length === 1 ? "campo da correggere" : "campi da correggere"})
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="party-tipo">Tipo comitiva</Label>
        <Select
          id="party-tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as PartyTipo);
            setExtraMembers(0);
          }}
        >
          <option value="SINGOLO">Ospite singolo</option>
          <option value="FAMIGLIA">Famiglia (capo + familiari)</option>
          <option value="GRUPPO">Gruppo (capo + membri)</option>
        </Select>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{isGroup ? "Capo comitiva" : "Ospite"}</p>
        <PersonFields
          idx={0}
          withDocument
          countries={countries}
          comuni={comuneOptions}
          luoghi={luogoOptions}
          documentTypes={documentTypes}
          errors={fieldErrors}
        />
      </div>

      {isGroup &&
        Array.from({ length: extraMembers }).map((_, i) => {
          const idx = i + 1;
          return (
            <div key={idx} className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {tipo === "FAMIGLIA" ? "Familiare" : "Membro"} {idx}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtraMembers((n) => Math.max(0, n - 1))}
                >
                  <Trash2 className="size-4" />
                  Rimuovi
                </Button>
              </div>
              <PersonFields
                idx={idx}
                withDocument={false}
                countries={countries}
                comuni={comuneOptions}
                luoghi={luogoOptions}
                documentTypes={documentTypes}
                errors={fieldErrors}
              />
              <p className="text-muted-foreground text-xs">
                Per familiari/membri i campi documento restano in bianco (tracciato Alloggiati
                19/20).
              </p>
            </div>
          );
        })}

      {isGroup && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setExtraMembers((n) => n + 1)}
        >
          <Plus className="size-4" />
          Aggiungi {tipo === "FAMIGLIA" ? "familiare" : "membro"}
        </Button>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Salvataggio…" : "Aggiungi ospiti"}
      </Button>

      {/* Esito generale: successo o errore NON legato ai campi (gli errori per campo hanno il
          riepilogo in cima + evidenziazione inline). */}
      {state && (state.ok || !fieldErrors) && (
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

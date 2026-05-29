"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { addGuestPartyAction } from "../actions";

type Country = { id: string; name: string };
type Comune = { id: string; name: string; provincia: string };
type DocumentType = { id: string; name: string };
type Option = { id: string; label: string };
type Result = { ok: boolean; message: string };
type PartyTipo = "SINGOLO" | "FAMIGLIA" | "GRUPPO";

/** Input con typeahead (datalist condivisa) che risolve l'etichetta scelta nell'id, in un hidden. */
function ComboBox({
  name,
  listId,
  options,
  placeholder,
  required,
}: {
  name: string;
  listId: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
}) {
  const [label, setLabel] = useState("");
  const id = useMemo(() => options.find((o) => o.label === label)?.id ?? "", [label, options]);
  const unmatched = label !== "" && id === "";
  return (
    <>
      <Input
        list={listId}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={placeholder}
        aria-invalid={unmatched}
        className={cn(unmatched && "border-destructive")}
      />
      {/* L'id risolto è ciò che viene inviato; se non corrisponde a un'opzione resta vuoto. */}
      <input type="hidden" name={name} value={id} required={required} />
    </>
  );
}

function PersonFields({
  idx,
  withDocument,
  countries,
  comuniListId,
  luoghiListId,
  comuni,
  luoghi,
  documentTypes,
}: {
  idx: number;
  withDocument: boolean;
  countries: Country[];
  comuniListId: string;
  luoghiListId: string;
  comuni: Option[];
  luoghi: Option[];
  documentTypes: DocumentType[];
}) {
  const f = (k: string) => `p${idx}.${k}`;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("lastName")}>Cognome</Label>
          <Input id={f("lastName")} name={f("lastName")} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("firstName")}>Nome</Label>
          <Input id={f("firstName")} name={f("firstName")} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("sex")}>Sesso</Label>
          <Select id={f("sex")} name={f("sex")} required defaultValue="">
            <option value="" disabled>
              Seleziona
            </option>
            <option value="M">Maschile</option>
            <option value="F">Femminile</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("birthDate")}>Data di nascita</Label>
          <Input id={f("birthDate")} name={f("birthDate")} type="date" required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={f("birthCountryId")}>Stato di nascita</Label>
          <Select id={f("birthCountryId")} name={f("birthCountryId")} required defaultValue="">
            <option value="" disabled>
              Seleziona
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Comune di nascita (se in Italia)</Label>
          <ComboBox
            name={f("birthComuneId")}
            listId={comuniListId}
            options={comuni}
            placeholder="Solo se nato in Italia"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={f("citizenshipId")}>Cittadinanza</Label>
        <Select id={f("citizenshipId")} name={f("citizenshipId")} required defaultValue="">
          <option value="" disabled>
            Seleziona
          </option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
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
            <Label>Luogo di rilascio (Comune o Stato)</Label>
            <ComboBox name={f("documentPlaceId")} listId={luoghiListId} options={luoghi} />
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
  const [state, action, pending] = useActionState<Result | null, FormData>(
    addGuestPartyAction,
    null,
  );
  const [tipo, setTipo] = useState<PartyTipo>("SINGOLO");
  // Numero di MEMBRI extra oltre al capo (solo FAMIGLIA/GRUPPO).
  const [extraMembers, setExtraMembers] = useState(0);

  const comuniListId = useId();
  const luoghiListId = useId();

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

  const isGroup = tipo !== "SINGOLO";
  const personCount = isGroup ? 1 + extraMembers : 1;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="stayId" value={stayId} />
      <input type="hidden" name="partyTipo" value={tipo} />
      <input type="hidden" name="personCount" value={personCount} />

      {/* Datalist condivise: renderizzate una volta, riusate da tutte le combobox. */}
      <datalist id={comuniListId}>
        {comuneOptions.map((o) => (
          <option key={o.id} value={o.label} />
        ))}
      </datalist>
      <datalist id={luoghiListId}>
        {luogoOptions.map((o) => (
          <option key={o.id} value={o.label} />
        ))}
      </datalist>

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
          comuniListId={comuniListId}
          luoghiListId={luoghiListId}
          comuni={comuneOptions}
          luoghi={luogoOptions}
          documentTypes={documentTypes}
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
                comuniListId={comuniListId}
                luoghiListId={luoghiListId}
                comuni={comuneOptions}
                luoghi={luogoOptions}
                documentTypes={documentTypes}
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

      {state && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
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
    </form>
  );
}

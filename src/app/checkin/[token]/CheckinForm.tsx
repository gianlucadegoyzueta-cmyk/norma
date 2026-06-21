"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComboBox, type ComboBoxLabels } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CheckinMessages, Locale } from "@/server/modules/checkin/messages";
import {
  MEZZO_TRASPORTO_OPTIONS,
  TIPO_TURISMO_OPTIONS,
} from "@/server/modules/istat/ross1000/domains";
import { type CheckinSubmitState, submitCheckinAction } from "./actions";

type Country = { id: string; name: string };
type DocumentType = { id: string; name: string };
type Option = { id: string; label: string };

/** Intestazione di una sezione del modulo: spezza i 16 campi in blocchi digeribili. */
function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <h2 className="text-foreground/80 text-xs font-semibold tracking-wide uppercase">
        {children}
      </h2>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function CheckinForm({
  token,
  locale,
  m,
  countries,
  comuni,
  luoghi,
  documentTypes,
}: {
  token: string;
  locale: Locale;
  m: CheckinMessages;
  countries: Country[];
  comuni: Option[];
  luoghi: Option[];
  documentTypes: DocumentType[];
}) {
  const [state, action] = useActionState(submitCheckinAction, {} as CheckinSubmitState);
  // Bump della key: rimonta il <form> per "Aggiungi un'altra persona" senza ricaricare la pagina
  // (niente flash, niente scroll perso, niente round-trip di rete come faceva window.location.reload).
  const [formKey, setFormKey] = useState(0);

  // Dopo un submit con errori: porta l'ospite al PRIMO campo errato (scroll + focus). Su un modulo
  // lungo da mobile è la differenza tra "non capisco perché non parte" e "ah, manca questo".
  // Stesso pattern del flusso autenticato (GuestPartyForm).
  useEffect(() => {
    if (state.fieldErrors) {
      const first = Object.keys(state.fieldErrors)[0];
      if (first) {
        // I combobox usano l'id "<campo>-cb"; gli altri controlli usano l'id = nome campo.
        const el = document.getElementById(first) ?? document.getElementById(`${first}-cb`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }
    }
  }, [state]);

  if (state.ok) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="bg-success/15 text-success flex size-12 items-center justify-center rounded-full text-2xl">
            ✓
          </span>
          <h2 className="font-display mt-1 text-xl font-semibold tracking-tight">
            {m.successTitle}
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm text-pretty">{m.successBody}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setFormKey((k) => k + 1)}
          >
            {m.addAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const err = (k: string) => state.fieldErrors?.[k];
  const errorId = (k: string) => `${k}-error`;
  const fieldError = (k: string) =>
    err(k) ? (
      <p id={errorId(k)} className="text-destructive text-xs" role="alert">
        {err(k)}
      </p>
    ) : null;
  // Collega l'errore al campo (aria-invalid + aria-describedby) così lo screen reader
  // annuncia il motivo quando l'ospite torna sul campo, non solo al submit.
  const invalidProps = (k: string) =>
    err(k) ? { "aria-invalid": true as const, "aria-describedby": errorId(k) } : {};

  const comboLabels: ComboBoxLabels = {
    noMatch: m.comboNoMatch,
    pickFromList: m.comboPickFromList,
    more: () => m.comboMore,
  };

  // Massimo oggi: nessuna data di nascita nel futuro (vincolo nativo, prima ancora del submit).
  const today = new Date().toISOString().slice(0, 10);

  const errorCount = state.fieldErrors ? Object.keys(state.fieldErrors).length : 0;

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="lang" value={locale} />

      {state.error && (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {state.error === "invalid" ? m.invalidBody : m.errorGeneric}
        </p>
      )}

      {/* Riepilogo errori: appare solo a submit fallito, con role=alert per l'annuncio immediato. */}
      {errorCount > 0 && (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {m.fixErrors}
        </p>
      )}

      <SectionHeading>{m.sectionIdentity}</SectionHeading>

      <div className="grid gap-1.5">
        <Label htmlFor="lastName">{m.lastName}</Label>
        <Input
          id="lastName"
          name="lastName"
          required
          autoComplete="family-name"
          autoCapitalize="words"
          {...invalidProps("lastName")}
        />
        {fieldError("lastName")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="firstName">{m.firstName}</Label>
        <Input
          id="firstName"
          name="firstName"
          required
          autoComplete="given-name"
          autoCapitalize="words"
          {...invalidProps("firstName")}
        />
        {fieldError("firstName")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="sex">{m.sex}</Label>
        <Select id="sex" name="sex" required defaultValue="" {...invalidProps("sex")}>
          <option value="" disabled>
            {m.select}
          </option>
          <option value="M">{m.sexM}</option>
          <option value="F">{m.sexF}</option>
        </Select>
        {fieldError("sex")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="birthDate">{m.birthDate}</Label>
        <Input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          max={today}
          {...invalidProps("birthDate")}
        />
        {fieldError("birthDate")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="birthCountryId">{m.birthCountry}</Label>
        <Select
          id="birthCountryId"
          name="birthCountryId"
          required
          defaultValue=""
          {...invalidProps("birthCountryId")}
        >
          <option value="" disabled>
            {m.select}
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
        <Label htmlFor="birthComuneId-cb">
          {m.birthComune} <span className="text-muted-foreground">({m.ifItaly})</span>
        </Label>
        <ComboBox
          id="birthComuneId-cb"
          name="birthComuneId"
          options={comuni}
          placeholder={m.select}
          labels={comboLabels}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="citizenshipId">{m.citizenship}</Label>
        <Select
          id="citizenshipId"
          name="citizenshipId"
          required
          defaultValue=""
          {...invalidProps("citizenshipId")}
        >
          <option value="" disabled>
            {m.select}
          </option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {fieldError("citizenshipId")}
      </div>

      <SectionHeading>{m.sectionDocument}</SectionHeading>

      <div className="grid gap-1.5">
        <Label htmlFor="documentTypeId">{m.documentType}</Label>
        <Select
          id="documentTypeId"
          name="documentTypeId"
          required
          defaultValue=""
          {...invalidProps("documentTypeId")}
        >
          <option value="" disabled>
            {m.select}
          </option>
          {documentTypes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        {fieldError("documentTypeId")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="documentNumber">{m.documentNumber}</Label>
        <Input
          id="documentNumber"
          name="documentNumber"
          required
          autoComplete="off"
          autoCapitalize="characters"
          {...invalidProps("documentNumber")}
        />
        {fieldError("documentNumber")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="documentPlaceId-cb">{m.documentPlace}</Label>
        <ComboBox
          id="documentPlaceId-cb"
          name="documentPlaceId"
          options={luoghi}
          placeholder={m.select}
          labels={comboLabels}
          describedBy={err("documentPlaceId") ? errorId("documentPlaceId") : undefined}
        />
        {fieldError("documentPlaceId")}
      </div>

      <SectionHeading hint={m.sectionResidenceHint}>{m.sectionResidence}</SectionHeading>

      <div className="grid gap-1.5">
        <Label htmlFor="residenceCountryId">
          {m.residenceCountry} <span className="text-muted-foreground">({m.optional})</span>
        </Label>
        <Select id="residenceCountryId" name="residenceCountryId" defaultValue="">
          <option value="">—</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="residenceComuneId-cb">
          {m.residenceComune} <span className="text-muted-foreground">({m.ifItaly})</span>
        </Label>
        <ComboBox
          id="residenceComuneId-cb"
          name="residenceComuneId"
          options={comuni}
          placeholder={m.select}
          labels={comboLabels}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="residenceForeignLocality">
          {m.residenceForeignLocality} <span className="text-muted-foreground">({m.optional})</span>
        </Label>
        <Input id="residenceForeignLocality" name="residenceForeignLocality" maxLength={30} />
      </div>

      <SectionHeading hint={m.sectionTripHint}>{m.sectionTrip}</SectionHeading>

      <div className="grid gap-1.5">
        <Label htmlFor="tourismType">{m.tourismType}</Label>
        <Select id="tourismType" name="tourismType" defaultValue="">
          <option value="">—</option>
          {TIPO_TURISMO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="transportMeans">{m.transportMeans}</Label>
        <Select id="transportMeans" name="transportMeans" defaultValue="">
          <option value="">—</option>
          {MEZZO_TRASPORTO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <SubmitButton className="mt-2 w-full" pendingLabel={m.submitting}>
        {m.submit}
      </SubmitButton>
    </form>
  );
}

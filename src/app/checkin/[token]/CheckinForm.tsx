"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CheckinMessages } from "@/server/modules/checkin/messages";
import {
  MEZZO_TRASPORTO_OPTIONS,
  TIPO_TURISMO_OPTIONS,
} from "@/server/modules/istat/ross1000/domains";
import { type CheckinSubmitState, submitCheckinAction } from "./actions";

type Country = { id: string; name: string };
type DocumentType = { id: string; name: string };
type Option = { id: string; label: string };

export function CheckinForm({
  token,
  m,
  countries,
  comuni,
  luoghi,
  documentTypes,
}: {
  token: string;
  m: CheckinMessages;
  countries: Country[];
  comuni: Option[];
  luoghi: Option[];
  documentTypes: DocumentType[];
}) {
  const [state, action] = useActionState(submitCheckinAction, {} as CheckinSubmitState);

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
            onClick={() => window.location.reload()}
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {state.error === "invalid" ? m.invalidBody : m.errorGeneric}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="lastName">{m.lastName}</Label>
        <Input
          id="lastName"
          name="lastName"
          required
          autoComplete="family-name"
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

      <div className="grid gap-1.5">
        <Label htmlFor="documentTypeId">{m.documentType}</Label>
        <Select id="documentTypeId" name="documentTypeId" required defaultValue="">
          <option value="" disabled>
            {m.select}
          </option>
          {documentTypes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="documentNumber">{m.documentNumber}</Label>
        <Input id="documentNumber" name="documentNumber" required autoComplete="off" />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="documentPlaceId-cb">{m.documentPlace}</Label>
        <ComboBox
          id="documentPlaceId-cb"
          name="documentPlaceId"
          options={luoghi}
          placeholder={m.select}
        />
      </div>

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
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="residenceForeignLocality">
          {m.residenceForeignLocality} <span className="text-muted-foreground">({m.optional})</span>
        </Label>
        <Input id="residenceForeignLocality" name="residenceForeignLocality" maxLength={30} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tourismType">
          {m.tourismType} <span className="text-muted-foreground">({m.optional})</span>
        </Label>
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
        <Label htmlFor="transportMeans">
          {m.transportMeans} <span className="text-muted-foreground">({m.optional})</span>
        </Label>
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

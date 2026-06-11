"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { describedById, Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { saveIdentityAction } from "../actions";

const USER_TYPES = [
  { value: "HOST_SINGOLO", title: "Host", desc: "Gestisco una o poche strutture mie" },
  {
    value: "PROPERTY_MANAGER",
    title: "Property manager",
    desc: "Gestisco strutture di terzi o molte",
  },
];

export function ActivityStep({
  onNext,
  onBack,
  defaults,
}: {
  onNext: () => void;
  onBack: () => void;
  defaults: {
    name: string | null;
    organizationName: string;
    userType: string | null;
    structuresCount: number | null;
  };
}) {
  const [state, action] = useActionState(saveIdentityAction, null);
  const advanced = useRef(false);
  useEffect(() => {
    if (state?.ok && !advanced.current) {
      advanced.current = true;
      onNext();
    }
  }, [state, onNext]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="ob-reveal mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Parlami di te</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Due cose e mi cucio addosso al tuo modo di lavorare. Niente di più.
        </p>
      </header>

      <form action={action} className="grid gap-4">
        {state && !state.ok && !fe ? <FormMessage>{state.message}</FormMessage> : null}

        <Field id="ob-name" label="Il tuo nome" error={fe?.name}>
          <Input
            id="ob-name"
            name="name"
            defaultValue={defaults.name ?? ""}
            required
            autoComplete="name"
            aria-invalid={fe?.name ? true : undefined}
            aria-describedby={describedById("ob-name", { error: !!fe?.name })}
          />
        </Field>

        <Field
          id="ob-org"
          label="Nome dell'organizzazione"
          hint="Potrai cambiarlo quando vuoi."
          error={fe?.organizationName}
        >
          <Input
            id="ob-org"
            name="organizationName"
            defaultValue={defaults.organizationName}
            required
            autoComplete="organization"
            aria-invalid={fe?.organizationName ? true : undefined}
            aria-describedby={describedById("ob-org", {
              hint: !fe?.organizationName,
              error: !!fe?.organizationName,
            })}
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm leading-none font-medium">Tipo di attività</legend>
          {USER_TYPES.map((o) => (
            <label
              key={o.value}
              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring border-border flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="userType"
                value={o.value}
                defaultChecked={defaults.userType === o.value}
                className="accent-primary mt-0.5 size-4"
              />
              <span>
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="text-muted-foreground block text-xs">{o.desc}</span>
              </span>
            </label>
          ))}
          {fe?.userType ? (
            <p role="alert" className="text-destructive text-xs">
              {fe.userType}
            </p>
          ) : null}
        </fieldset>

        <Field
          id="ob-structures"
          label="Quante strutture gestisci? (facoltativo)"
          error={fe?.structuresCount}
        >
          <Input
            id="ob-structures"
            name="structuresCount"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={defaults.structuresCount ?? ""}
            aria-invalid={fe?.structuresCount ? true : undefined}
            aria-describedby={describedById("ob-structures", { error: !!fe?.structuresCount })}
            className={cn(fe?.structuresCount && "border-destructive")}
          />
        </Field>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            Indietro
          </Button>
          <SubmitButton className="flex-1" pendingLabel="Salvataggio…">
            Continua
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

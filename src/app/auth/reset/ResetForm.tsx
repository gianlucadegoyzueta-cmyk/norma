"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/auth/reset/actions";
import { describedById, Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const PASSWORD_HINT = "Almeno 8 caratteri, con lettere e numeri.";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage>{state.error}</FormMessage>

      <Field id="reset-password" label="Nuova password" hint={PASSWORD_HINT}>
        <Input
          id="reset-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          aria-describedby={describedById("reset-password", { hint: true })}
        />
      </Field>

      <Field id="reset-confirm" label="Conferma password">
        <Input
          id="reset-confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Aggiornamento…">
        Imposta nuova password
      </SubmitButton>
    </form>
  );
}

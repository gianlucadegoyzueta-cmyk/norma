"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/auth/forgot/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, {});

  if (state.sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Controlla la tua email</CardTitle>
          <CardDescription>
            Se esiste un account con questa email, ti abbiamo inviato un link per reimpostare la
            password. È valido per 30 minuti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 text-sm transition-colors"
          >
            Torna al login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Password dimenticata?</CardTitle>
        <CardDescription>
          Inserisci la tua email: ti invieremo un link per impostarne una nuova.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <FormMessage>{state.error}</FormMessage>
          <Field id="forgot-email" label="Email">
            <Input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@esempio.it"
            />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Invio in corso…">
            Invia il link di reset
          </SubmitButton>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-center text-sm transition-colors"
          >
            Torna al login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerWithPassword } from "@/app/signup/actions";
import { AuthDivider } from "@/components/auth-divider";
import { GoogleButton } from "@/components/google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describedById, Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

// Tenuto in sincrono con validatePassword() lato server (qui è solo testo d'aiuto, no logica).
const PASSWORD_HINT = "Almeno 8 caratteri, con lettere e numeri.";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(registerWithPassword, {});

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Crea il tuo account</CardTitle>
          <CardDescription>Bastano pochi dati per iniziare.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form action={action} className="flex flex-col gap-4">
            <FormMessage>{state.error}</FormMessage>

            <Field id="signup-name" label="Il tuo nome">
              <Input
                id="signup-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Mario Rossi"
              />
            </Field>

            <Field
              id="signup-org"
              label="Nome dell'organizzazione"
              hint="L'azienda o l'attività con cui gestisci gli affitti. Potrai cambiarlo dopo."
            >
              <Input
                id="signup-org"
                name="organizationName"
                type="text"
                required
                autoComplete="organization"
                placeholder="Es. Rossi Affitti Brevi"
                aria-describedby={describedById("signup-org", { hint: true })}
              />
            </Field>

            <Field id="signup-email" label="Email">
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@esempio.it"
              />
            </Field>

            <Field id="signup-password" label="Password" hint={PASSWORD_HINT}>
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                aria-describedby={describedById("signup-password", { hint: true })}
              />
            </Field>

            <SubmitButton className="w-full" pendingLabel="Creazione account…">
              Crea account
            </SubmitButton>
          </form>

          {googleEnabled ? (
            <div className="flex flex-col gap-5">
              <AuthDivider />
              <GoogleButton />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        Hai già un account?{" "}
        <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
          Accedi
        </Link>
      </p>
    </>
  );
}

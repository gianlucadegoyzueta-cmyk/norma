"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithPassword } from "@/app/login/actions";
import { AuthDivider } from "@/components/auth-divider";
import { GoogleButton } from "@/components/google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ googleEnabled, notice }: { googleEnabled: boolean; notice?: string }) {
  const [pwState, pwAction] = useActionState(signInWithPassword, {});

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Bentornato</CardTitle>
          <CardDescription>Accedi al tuo spazio Norma.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {notice ? <FormMessage variant="success">{notice}</FormMessage> : null}

          <form action={pwAction} className="flex flex-col gap-4">
            <FormMessage>{pwState.error}</FormMessage>
            <Field id="login-email" label="Email">
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@esempio.it"
                aria-invalid={pwState.error ? true : undefined}
              />
            </Field>
            <Field
              id="login-password"
              label={
                <span className="flex items-center justify-between gap-2">
                  <span>Password</span>
                  <Link
                    href="/auth/forgot"
                    className="text-muted-foreground hover:text-foreground text-xs font-normal underline-offset-2 hover:underline"
                  >
                    Password dimenticata?
                  </Link>
                </span>
              }
            >
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={pwState.error ? true : undefined}
              />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Accesso…">
              Accedi
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
        Non hai un account?{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Crea un account
        </Link>
      </p>
    </>
  );
}

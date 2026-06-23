"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * UI condivisa per le error boundary delle rotte auth (cornice AuthShell + messaggio gentile + retry).
 * Cattura l'errore su Sentry (come global-error.tsx) così i crash di rotta non restano silenziati.
 */
export function AuthRouteError({
  error,
  reset,
  message = "Si è verificato un imprevisto. Riprova: di solito basta un secondo tentativo.",
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
  message?: string;
}) {
  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle>Qualcosa è andato storto</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {reset ? (
            <Button onClick={reset} className="w-full">
              Riprova
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

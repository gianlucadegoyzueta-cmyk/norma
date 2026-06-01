"use client";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** UI condivisa per le error boundary delle rotte auth (cornice AuthShell + messaggio gentile + retry). */
export function AuthRouteError({
  reset,
  message = "Si è verificato un imprevisto. Riprova: di solito basta un secondo tentativo.",
}: {
  reset?: () => void;
  message?: string;
}) {
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

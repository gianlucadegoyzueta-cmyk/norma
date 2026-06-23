"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * UI condivisa per le error boundary di rotta (error.tsx): messaggio gentile + "Riprova" (reset)
 * + ritorno alla dashboard. Client component (richiesto da error.tsx di Next).
 * Cattura l'errore su Sentry (come global-error.tsx) così i crash di rotta non restano silenziati.
 */
export function RouteError({
  error,
  reset,
  title = "Qualcosa è andato storto",
  message = "Si è verificato un imprevisto durante il caricamento. Riprova: di solito basta un secondo tentativo.",
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  message?: string;
}) {
  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span
            aria-hidden
            className="bg-warning/15 text-warning-foreground mb-2 flex size-12 items-center justify-center rounded-full"
          >
            <AlertTriangle className="size-6" />
          </span>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {reset ? (
            <Button onClick={reset} className="w-full">
              Riprova
            </Button>
          ) : null}
          <Link href="/dashboard" className="w-full">
            <Button variant="ghost" className="w-full">
              Torna alla dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

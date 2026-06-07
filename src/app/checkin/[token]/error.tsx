"use client";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Error boundary PUBBLICA del check-in: niente link alla dashboard (l'ospite non è loggato).
 * Messaggio neutro bilingue IT/EN, dato che qui non conosciamo la lingua scelta.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Brand />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-pretty">
              Si è verificato un errore. Riprova tra poco.
              <br />
              <span className="text-muted-foreground">Something went wrong. Please try again.</span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Riprova · Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

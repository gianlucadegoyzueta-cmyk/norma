import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/** Loading condiviso per le rotte di autenticazione (cornice coerente con le pagine auth). */
export function AuthRouteLoading() {
  return (
    <AuthShell>
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="size-6" label="Caricamento…" />
        </CardContent>
      </Card>
    </AuthShell>
  );
}

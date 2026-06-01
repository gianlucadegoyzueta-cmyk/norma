import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Accesso non riuscito" };

// Messaggi gentili e azionabili per i codici d'errore di Auth.js. Default prudente per gli altri.
const MESSAGES: Record<string, { title: string; description: string }> = {
  Verification: {
    title: "Link non più valido",
    description:
      "Questo link di accesso è scaduto o è già stato usato. Richiedine uno nuovo: bastano pochi secondi.",
  },
  AccessDenied: {
    title: "Accesso negato",
    description:
      "Non abbiamo ricevuto il consenso per continuare. Riprova e autorizza l'accesso, oppure usa un altro metodo.",
  },
  OAuthAccountNotLinked: {
    title: "Email già in uso",
    description:
      "Questa email è già collegata a un altro metodo di accesso. Entra con quello che hai usato la prima volta.",
  },
  Configuration: {
    title: "Qualcosa non va dalla nostra parte",
    description:
      "Si è verificato un problema di configurazione. Riprova tra poco: se persiste, contattaci.",
  },
};

const FALLBACK = {
  title: "Accesso non riuscito",
  description:
    "Si è verificato un imprevisto durante l'accesso. Riprova: di solito basta un secondo tentativo.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, description } = (error && MESSAGES[error]) || FALLBACK;

  return (
    <AuthShell>
      <Card>
        <CardHeader className="items-center text-center">
          <span
            aria-hidden
            className="bg-warning/12 text-warning mb-2 flex size-12 items-center justify-center rounded-full"
          >
            <AlertTriangle className="size-6" />
          </span>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button className="w-full">Riprova ad accedere</Button>
          </Link>
          <Link href="/auth/forgot" className="w-full">
            <Button variant="ghost" className="w-full">
              Reimposta la password
            </Button>
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

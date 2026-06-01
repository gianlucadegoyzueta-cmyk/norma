import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { SiteHeader } from "@/components/site-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialForm } from "./CredentialForm";

export const metadata: Metadata = { title: "Credenziali Alloggiati" };

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; variant: BadgeProps["variant"] }> = {
  ACTIVE: { text: "Attiva", variant: "success" },
  INVALID: { text: "Non valida", variant: "destructive" },
  PENDING_REONBOARDING: { text: "Da verificare", variant: "warning" },
  DISABLED: { text: "Disattivata", variant: "secondary" },
};

export default async function CredentialsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const credentials = await new PrismaCredentialRepository(prisma).listByOrganization(
    ctx.current.organizationId,
  );

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Credenziali Alloggiati</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Org <strong className="text-foreground">{ctx.current.organizationName}</strong>. Le
            credenziali (utente / password / WSKey) sono salvate{" "}
            <span className="text-foreground inline-flex items-center gap-1 font-medium">
              <ShieldCheck className="text-success size-3.5" />
              cifrate
            </span>{" "}
            nel vault, mai in chiaro. Ogni nuova credenziale viene verificata subito con Alloggiati
            (<em>Authentication_Test</em>) — nessun invio di schedine.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Le tue credenziali</h2>
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                  <KeyRound className="size-5" />
                </span>
                <p className="text-muted-foreground text-sm">
                  Nessuna credenziale ancora. Aggiungine una qui sotto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {credentials.map((c) => {
                const s = STATUS[c.status] ?? { text: c.status, variant: "secondary" as const };
                return (
                  <li key={c.id}>
                    <Card>
                      <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.label}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {c.category === "GESTIONE_APPARTAMENTI"
                              ? "gestione appartamenti"
                              : "struttura singola"}{" "}
                            · {c.provincia}
                          </p>
                        </div>
                        <Badge variant={s.variant}>{s.text}</Badge>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Aggiungi credenziale</CardTitle>
            </CardHeader>
            <CardContent>
              <CredentialForm />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

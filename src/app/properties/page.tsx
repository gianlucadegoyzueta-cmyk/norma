import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, KeyRound, MapPin } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyForm } from "./PropertyForm";

export const metadata: Metadata = { title: "Immobili" };

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const propertyRepo = new PrismaPropertyRepository(prisma);

  // Credenziali collegabili: tutte tranne quelle disattivate (così si può collegare anche una
  // credenziale ancora "da verificare"). Le province coperte filtrano i Comuni selezionabili.
  const allCredentials = await new PrismaCredentialRepository(prisma).listByOrganization(orgId);
  const credentials = allCredentials
    .filter((c) => c.status !== "DISABLED")
    .map((c) => ({ id: c.id, label: c.label, provincia: c.provincia }));

  const province = [...new Set(credentials.map((c) => c.provincia))];
  const [properties, comuni] = await Promise.all([
    propertyRepo.listByOrganization(orgId),
    propertyRepo.listSelectableComuni(province),
  ]);

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Immobili</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Gli immobili di{" "}
            <strong className="text-foreground">{ctx.current.organizationName}</strong>. Ogni
            immobile si collega a una credenziale Alloggiati per l&apos;invio delle schedine; il
            Comune dev&apos;essere nella provincia di competenza della credenziale.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">I tuoi immobili</h2>
          {properties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                  <Building2 className="size-5" />
                </span>
                <p className="text-muted-foreground text-sm">
                  Nessun immobile ancora. Aggiungine uno qui sotto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {properties.map((p) => (
                <li key={p.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                          <MapPin className="size-3 shrink-0" />
                          {p.address} · {p.comune.name} ({p.comune.provincia}) · {p.proprietario}
                        </p>
                      </div>
                      {p.credential ? (
                        <Badge variant="secondary" className="shrink-0">
                          <KeyRound className="size-3" />
                          {p.credential.label}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="shrink-0">
                          Senza credenziale
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Aggiungi immobile</CardTitle>
            </CardHeader>
            <CardContent>
              {credentials.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  Per aggiungere un immobile serve almeno una credenziale Alloggiati (definisce la
                  provincia e i Comuni disponibili).{" "}
                  <Link href="/credentials" className="text-foreground font-medium underline">
                    Aggiungi una credenziale
                  </Link>
                  .
                </div>
              ) : (
                <PropertyForm credentials={credentials} comuni={comuni} />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

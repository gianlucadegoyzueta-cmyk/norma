import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, MapPin } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { CinService, PrismaCinRepository, propertyNeedsCin } from "@/server/modules/cin";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CinInlineForm } from "./CinInlineForm";
import { PropertyForm } from "./PropertyForm";

export const metadata: Metadata = { title: "Immobili" };

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const propertyRepo = new PrismaPropertyRepository(prisma);
  const cinService = new CinService(new PrismaCinRepository(prisma));

  const allCredentials = await new PrismaCredentialRepository(prisma).listByOrganization(orgId);
  const credentials = allCredentials
    .filter((c) => c.status !== "DISABLED")
    .map((c) => ({ id: c.id, label: c.label, provincia: c.provincia }));

  const province = [...new Set(credentials.map((c) => c.provincia))];
  const [properties, comuni, cinByPropertyId] = await Promise.all([
    propertyRepo.listByOrganization(orgId),
    propertyRepo.listSelectableComuni(province),
    cinService.listProperties(orgId).then((rows) => new Map(rows.map((r) => [r.id, r]))),
  ]);

  // Riepilogo leggero sempre in testa (no salti di layout negli stati parziali): tre numeri
  // chiave da dati GIÀ caricati — totale immobili, quanti senza credenziale, quanti senza CIN.
  const withoutCredential = properties.filter((p) => !p.credential).length;
  const withoutCin = properties.filter((p) => {
    const cin = cinByPropertyId.get(p.id);
    return cin ? propertyNeedsCin(cin.cinStatus) : true;
  }).length;

  return (
    <ConciergePage
      dense
      active="properties"
      kicker="ANAGRAFICA · IMMOBILI"
      title="Immobili"
      intro={
        <>
          L&apos;<strong>elenco dei singoli immobili</strong> di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>{ctx.current.organizationName}</strong> e
          la loro configurazione: qui aggiungi un immobile e lo colleghi a una credenziale
          Alloggiati per inviare le schedine (il Comune dev&apos;essere nella provincia di
          competenza della credenziale). Per la vista d&apos;insieme della compliance su tutte le
          strutture vai alle{" "}
          <Link href="/agency" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
            Strutture
          </Link>
          .
        </>
      }
    >
      {/* Riepilogo sempre presente: niente salti di layout quando l'elenco è vuoto o parziale.
          Tre numeri sobri da dati già caricati (totale, senza credenziale, senza CIN). */}
      <div className="cmx-section flex flex-wrap gap-x-6 gap-y-2" style={{ marginTop: 0 }}>
        {(
          [
            { label: "immobili", value: properties.length },
            { label: "senza credenziale", value: withoutCredential },
            { label: "senza CIN", value: withoutCin },
          ] as const
        ).map((stat) => (
          <div key={stat.label} className="flex flex-col leading-tight">
            <span className="text-foreground text-lg font-semibold tabular-nums">{stat.value}</span>
            <span className="text-muted-foreground text-[11px] tracking-[0.04em] uppercase">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Onboarding guidato: senza una credenziale Alloggiati non si può aggiungere un immobile
          (definisce provincia e Comuni). Indirizziamo subito al primo passo invece di un form muto. */}
      {credentials.length === 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle>Inizia qui</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-muted-foreground text-sm">
                Il primo passo è collegare una credenziale Alloggiati: definisce la provincia e i
                Comuni disponibili per i tuoi immobili, e da lì Norma prepara le schedine pronte da
                confermare.
              </p>
              <div>
                <Link href="/credentials">
                  <Button size="sm">Aggiungi una credenziale</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section aria-labelledby="properties-heading" className="cmx-section">
        <h2 id="properties-heading" className="cmx-section-title">
          I tuoi immobili
        </h2>
        {properties.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessun immobile, per ora</p>
            <p className="cmx-empty-text">
              Aggiungine uno qui sotto: indirizzo, Comune e credenziale di competenza.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {properties.map((p) => {
              const cin = cinByPropertyId.get(p.id);
              const needsCin = cin ? propertyNeedsCin(cin.cinStatus) : true;
              return (
                <li key={p.id}>
                  <div
                    className="cmx-row"
                    style={{ flexDirection: "column", alignItems: "stretch" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        href={`/properties/${p.id}`}
                        className="focus-visible:ring-ring cmx-row-main -m-1 flex-1 rounded-md p-1 outline-none focus-visible:ring-2"
                      >
                        <p className="cmx-row-title truncate hover:underline">{p.name}</p>
                        <p className="cmx-row-meta flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0" aria-hidden />
                          {p.address} · {p.comune.name} ({p.comune.provincia}) · {p.proprietario}
                        </p>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {p.credential ? (
                          <span className="cmx-badge cmx-badge-wait inline-flex items-center gap-1">
                            <KeyRound className="size-3" aria-hidden />
                            {p.credential.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="cmx-badge cmx-badge-err">Senza credenziale</span>
                            <Link
                              href={`/properties/${p.id}`}
                              className="text-xs font-medium"
                              style={{ color: "var(--terracotta)" }}
                            >
                              collega
                            </Link>
                          </span>
                        )}
                        {needsCin ? (
                          <span className="cmx-badge cmx-badge-err">Senza CIN</span>
                        ) : (
                          <span className="cmx-badge cmx-badge-ok">CIN ottenuto</span>
                        )}
                      </div>
                    </div>
                    {cin && (
                      <CinInlineForm propertyId={p.id} cin={cin.cin} cinStatus={cin.cinStatus} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>Aggiungi immobile</CardTitle>
          </CardHeader>
          <CardContent>
            {credentials.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Disponibile dopo aver collegato una credenziale Alloggiati (vedi{" "}
                <Link href="/credentials" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Inizia qui
                </Link>
                , sopra): definisce provincia e Comuni dell&apos;immobile.
              </div>
            ) : (
              <PropertyForm credentials={credentials} comuni={comuni} />
            )}
          </CardContent>
        </Card>
      </section>
    </ConciergePage>
  );
}

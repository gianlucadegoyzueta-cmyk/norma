import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialForm } from "./CredentialForm";
import { ExportDataButton } from "./ExportDataButton";

export const metadata: Metadata = { title: "Credenziali Alloggiati" };

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; cmx: string }> = {
  ACTIVE: { text: "Attiva", cmx: "cmx-badge-ok" },
  INVALID: { text: "Non valida", cmx: "cmx-badge-err" },
  PENDING_REONBOARDING: { text: "Da verificare", cmx: "cmx-badge-wait" },
  DISABLED: { text: "Disattivata", cmx: "cmx-badge-wait" },
};

export default async function CredentialsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const credentials = await new PrismaCredentialRepository(prisma).listByOrganization(
    ctx.current.organizationId,
  );

  // Riepilogo leggero sempre in testa (no salti di layout negli stati parziali): tre numeri
  // chiave da dati già caricati — totale, attive, da verificare (non valide o da rionboardare).
  const activeCount = credentials.filter((c) => c.status === "ACTIVE").length;
  const toVerifyCount = credentials.filter(
    (c) => c.status === "INVALID" || c.status === "PENDING_REONBOARDING",
  ).length;

  return (
    <ConciergePage
      dense
      active="credentials"
      kicker="VAULT · ALLOGGIATI WEB"
      title="Credenziali Alloggiati"
      intro={
        <>
          Le credenziali di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>{ctx.current.organizationName}</strong>{" "}
          (utente / password / WSKey): le custodisco{" "}
          <span
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: "var(--inchiostro)" }}
          >
            <ShieldCheck className="size-3.5" style={{ color: "var(--salvia)" }} aria-hidden />
            cifrate
          </span>{" "}
          nel vault, mai in chiaro. Verifico subito ogni nuova credenziale con Alloggiati (
          <em>Authentication_Test</em>) — nessun invio di schedine.
        </>
      }
    >
      {/* Riepilogo sempre presente: niente salti di layout quando la lista è vuota o parziale.
          Tre numeri sobri da dati già caricati (totale, attive, da verificare). */}
      <div className="cmx-section flex flex-wrap gap-x-6 gap-y-2" style={{ marginTop: 0 }}>
        {(
          [
            { label: "credenziali", value: credentials.length },
            { label: "attive", value: activeCount },
            { label: "da verificare", value: toVerifyCount },
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

      {/* Onboarding guidato: le credenziali sono il primo dei tre passi (Credenziali · Immobile ·
          Soggiorno). Senza, non nasce alcuna schedina: lo diciamo subito invece di una lista vuota. */}
      {credentials.length === 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle>Inizia qui</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Le credenziali Alloggiati sono il <strong>primo dei tre passi</strong> — Credenziali
                ·{" "}
                <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Immobile
                </Link>{" "}
                ·{" "}
                <Link href="/stays" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Soggiorno
                </Link>
                . Aggiungine una nel modulo qui sotto: la verifico subito con Alloggiati (senza
                inviare nulla) e da lì preparo le schedine pronte da confermare.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <section aria-labelledby="credentials-heading" className="cmx-section">
        <h2 id="credentials-heading" className="cmx-section-title">
          Le tue credenziali
        </h2>
        {credentials.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna credenziale, per ora</p>
            <p className="cmx-empty-text">
              Aggiungine una qui sotto: la verifico subito con Alloggiati, senza inviare nulla.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {credentials.map((c) => {
              const s = STATUS[c.status] ?? { text: c.status, cmx: "cmx-badge-wait" };
              return (
                <li key={c.id} id={`cred-${c.id}`} className="scroll-mt-24">
                  <div className="cmx-row">
                    <div className="cmx-row-main">
                      <p className="cmx-row-title truncate">{c.label}</p>
                      <p className="cmx-row-meta truncate">
                        {c.category === "GESTIONE_APPARTAMENTI"
                          ? "gestione appartamenti"
                          : "struttura singola"}{" "}
                        · {c.provincia}
                      </p>
                    </div>
                    <span className={`cmx-badge ${s.cmx}`}>{s.text}</span>
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
            <CardTitle>Aggiungi credenziale</CardTitle>
          </CardHeader>
          <CardContent>
            <CredentialForm />
          </CardContent>
        </Card>
      </section>

      {/* Esporta tutto: i dati dell'host sono suoi, scaricabili in qualsiasi momento. */}
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>I tuoi dati</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm text-pretty">
              I dati sono tuoi, sempre. Scarica un archivio con soggiorni, ospiti, tasse di
              soggiorno e invii ISTAT in formato CSV (apribili con Excel o Fogli Google).
            </p>
            <ExportDataButton />
          </CardContent>
        </Card>
      </section>
    </ConciergePage>
  );
}

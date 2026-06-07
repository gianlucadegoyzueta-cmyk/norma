import type { Metadata } from "next";
import { BedDouble, FileText, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, type CardVariant } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { Select } from "@/components/ui/select";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };
export const dynamic = "force-dynamic";

const SWATCHES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["accent", "bg-accent"],
  ["muted", "bg-muted"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
  ["border", "bg-border"],
] as const;

const CARD_VARIANTS: CardVariant[] = ["default", "info", "success", "warning", "destructive"];

/** Vetrina interna del design system (token + componenti). Solo per revisione, non indicizzata. */
export default async function DesignPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          title="Design system"
          description="Token e componenti consolidati di Norma. Questa pagina è la fonte di verità visiva: prima il sistema, poi le schermate."
        />

        {/* COLORI */}
        <section className="mb-10">
          <SectionHeading>Colori</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SWATCHES.map(([name, bg]) => (
              <div key={name} className="space-y-1.5">
                <div className={`border-border h-14 w-full rounded-lg border ${bg}`} />
                <p className="text-muted-foreground text-xs">{name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TIPOGRAFIA */}
        <section className="mb-10">
          <SectionHeading>Tipografia</SectionHeading>
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="font-display text-3xl font-semibold tracking-tight">
                Titolo display · Fraunces
              </p>
              <p className="font-display text-xl font-semibold tracking-tight">
                Intestazione di sezione · Fraunces
              </p>
              <p className="text-base">
                Corpo del testo in Geist: leggibile, calmo, pensato anche per chi non è tecnico e
                legge dal telefono.
              </p>
              <p className="text-muted-foreground text-sm">Testo secondario · muted-foreground</p>
              <p className="text-muted-foreground text-xs">Testo piccolo · note e hint</p>
            </CardContent>
          </Card>
        </section>

        {/* OMBRE */}
        <section className="mb-10">
          <SectionHeading>Elevazione</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["shadow-card", "shadow-card-hover", "shadow-overlay"] as const).map((s) => (
              <div
                key={s}
                className={`bg-card flex h-20 items-center justify-center rounded-xl ${s}`}
              >
                <span className="text-muted-foreground text-xs">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTONI */}
        <section className="mb-10">
          <SectionHeading>Bottoni</SectionHeading>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primario</Button>
            <Button variant="secondary">Secondario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Distruttivo</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
          </div>
        </section>

        {/* BADGE */}
        <section className="mb-10">
          <SectionHeading>Badge / stati</SectionHeading>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondario</Badge>
            <Badge variant="success">Acquisita</Badge>
            <Badge variant="warning">Da verificare</Badge>
            <Badge variant="destructive">Respinta</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* INPUT */}
        <section className="mb-10">
          <SectionHeading>Campi</SectionHeading>
          <div className="grid max-w-md gap-3">
            <Input placeholder="Campo di testo…" />
            <Input aria-invalid placeholder="Campo in errore (aria-invalid)" />
            <Select defaultValue="">
              <option value="" disabled>
                Seleziona…
              </option>
              <option>Opzione A</option>
              <option>Opzione B</option>
            </Select>
          </div>
        </section>

        {/* CARD VARIANTI */}
        <section className="mb-10">
          <SectionHeading>Card — varianti semantiche</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            {CARD_VARIANTS.map((v) => (
              <Card key={v} variant={v}>
                <CardContent className="p-5">
                  <p className="font-display font-semibold tracking-tight">
                    variant=&quot;{v}&quot;
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Una sola Card per tutti gli avvisi: niente più stili fatti a mano per pagina.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CALLOUT */}
        <section className="mb-10">
          <SectionHeading>Callout — messaggi calmi</SectionHeading>
          <div className="grid gap-3">
            <Callout tone="info" icon={Info} title="Informazione">
              Le tue credenziali restano <strong>cifrate</strong> nel vault, mai in chiaro.
            </Callout>
            <Callout tone="success" icon={ShieldCheck} title="In regola">
              Schedina <strong>acquisita</strong> dalla Questura. Tutto a posto.
            </Callout>
            <Callout tone="warning" icon={TriangleAlert} title="Da verificare">
              Inviata, esito non ancora confermato dal portale: viene verificata in automatico.{" "}
              <strong>Non re-inviare.</strong>
            </Callout>
            <Callout tone="destructive" icon={TriangleAlert} title="Respinta">
              Il portale ha respinto la schedina: correggi il dato indicato e rimettila in coda.
            </Callout>
          </div>
        </section>

        {/* EMPTY STATE */}
        <section className="mb-10">
          <SectionHeading>Stato vuoto</SectionHeading>
          <Card>
            <EmptyState
              icon={BedDouble}
              title="Nessun soggiorno ancora"
              description="Crea il primo soggiorno: da lì aggiungi gli ospiti e generi le schedine per Alloggiati."
              action={<Button size="sm">Crea soggiorno</Button>}
            />
          </Card>
        </section>

        {/* SKELETON */}
        <section className="mb-4">
          <SectionHeading>Caricamento</SectionHeading>
          <Card>
            <CardContent className="space-y-2 p-6">
              <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-muted h-16 w-full animate-pulse rounded-lg" />
              <div className="bg-muted h-16 w-full animate-pulse rounded-lg" />
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-3 inline-flex items-center gap-2 text-xs">
            <FileText className="size-3.5" aria-hidden /> Bozza del sistema — i componenti
            interattivi (Toast, Dialog) arrivano nella prossima PR, poi l&apos;applicazione alle
            schermate.
          </p>
        </section>
      </main>
    </div>
  );
}

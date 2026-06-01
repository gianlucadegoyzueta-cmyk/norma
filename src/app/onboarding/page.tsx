import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, Check, FileText, KeyRound, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getOnboardingState, type OnboardingStepKey } from "@/server/modules/onboarding/state";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Configurazione" };
export const dynamic = "force-dynamic";

// Contenuto editoriale di ogni passo: titolo, spiegazione, CTA e dove porta. Lo STATO (done) arriva
// da getOnboardingState; qui sta solo la presentazione, così logica e copy restano separati.
const STEP_META: Record<
  OnboardingStepKey,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    cta: string;
    doneCta: string;
  }
> = {
  credential: {
    icon: KeyRound,
    title: "Collega la credenziale Alloggiati",
    description:
      "Inserisci utente, password e WSKey della tua utenza Alloggiati Web. Le salviamo cifrate nel vault e le verifichiamo subito (nessun invio di schedine).",
    href: "/credentials",
    cta: "Aggiungi credenziale",
    doneCta: "Gestisci credenziali",
  },
  reference: {
    icon: RefreshCw,
    title: "Sincronizza le tabelle di riferimento",
    description:
      "Comuni, Stati e tipi di documento ufficiali. Servono per compilare le schedine: si scaricano dal web service di Alloggiati con una credenziale valida.",
    href: "/credentials",
    cta: "Come sincronizzare",
    doneCta: "Tabelle pronte",
  },
  property: {
    icon: Building2,
    title: "Aggiungi il primo immobile",
    description:
      "Registra una struttura e collegala alla credenziale. Il Comune deve ricadere nella provincia di competenza della credenziale.",
    href: "/properties",
    cta: "Aggiungi immobile",
    doneCta: "Gestisci immobili",
  },
  stay: {
    icon: FileText,
    title: "Crea il primo soggiorno",
    description:
      "Inserisci un soggiorno con i suoi ospiti: da lì generi le schedine, le verifichi e le invii ad Alloggiati.",
    href: "/stays",
    cta: "Crea soggiorno",
    doneCta: "Gestisci soggiorni",
  },
};

const ORDER: OnboardingStepKey[] = ["credential", "reference", "property", "stay"];

export default async function OnboardingPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const state = await getOnboardingState(prisma, ctx.current.organizationId);
  const doneByKey = new Map(state.steps.map((s) => [s.key, s.done]));

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {state.ready ? "Tutto pronto 🎉" : "Configura Norma"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {state.ready
              ? "Hai completato la configurazione: sei pronto a inviare le schedine."
              : "Quattro passi per iniziare a comunicare ad Alloggiati. Lo stato si aggiorna da solo man mano che completi."}
          </p>

          {/* Barra di avanzamento */}
          <div className="mt-5">
            <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
              <span>Avanzamento</span>
              <span>
                {state.completed}/{state.total}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${(state.completed / state.total) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <ol className="grid gap-3">
          {ORDER.map((key, i) => {
            const meta = STEP_META[key];
            const done = doneByKey.get(key) ?? false;
            const Icon = meta.icon;
            const isNext = state.nextStep === key;
            return (
              <li key={key}>
                <Card className={cn(isNext && "border-primary/50")}>
                  <CardContent className="flex items-start gap-4 px-4 py-4">
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        done ? "bg-success/12 text-success" : "bg-primary/10 text-primary",
                      )}
                    >
                      {done ? <Check className="size-5" /> : <Icon className="size-5" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium tabular-nums">
                          {i + 1}.
                        </span>
                        <h2 className="font-medium">{meta.title}</h2>
                        {done && (
                          <Badge variant="success" className="ml-auto shrink-0">
                            Fatto
                          </Badge>
                        )}
                        {isNext && !done && (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            Da fare
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-sm">{meta.description}</p>
                      <Link href={meta.href} className="mt-3 inline-block">
                        <Button variant={done ? "ghost" : isNext ? "default" : "outline"} size="sm">
                          {done ? meta.doneCta : meta.cta}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>

        {state.ready && (
          <div className="mt-8">
            <Link href="/schedine">
              <Button>Vai alle schedine</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

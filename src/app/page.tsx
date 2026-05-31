import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { RotatingWord } from "@/components/marketing/RotatingWord";
import {
  FAQS,
  FEATURES,
  MODULES,
  PRICING,
  PRICING_PLANS,
  STEPS,
  STORIES,
  TESTIMONIALS,
} from "@/components/marketing/data";

export const metadata: Metadata = {
  title: { absolute: "Norma — La compliance degli affitti brevi, senza pensieri" },
  description:
    "Norma registra gli ospiti e invia in automatico le schedine ad Alloggiati Web della Polizia di Stato. Niente doppioni, niente scadenze perse: affitti brevi sempre in regola.",
};

const TRUST = [
  "Alloggiati Web · Polizia di Stato",
  "Tracciato ufficiale a 168/174 caratteri",
  "Credenziali per Questura",
  "Pattern outbox anti-doppione",
];

const STATS = [
  { value: "100%", label: "conforme al tracciato ufficiale Alloggiati Web" },
  { value: "< 2 min", label: "dall'arrivo dell'ospite alla schedina inviata" },
  { value: "0", label: "schedine doppie: l'invio è protetto per costruzione" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Striscia annuncio */}
      <Link
        href="/login"
        className="bg-primary text-primary-foreground group flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium"
      >
        <Sparkles className="size-4" />
        <span>Norma invia le schedine ad Alloggiati Web in automatico — 14 giorni gratis</span>
        <span className="hidden items-center gap-1 underline-offset-4 group-hover:underline sm:inline-flex">
          Inizia ora <ArrowRight className="size-3.5" />
        </span>
      </Link>

      <MarketingHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_-5%,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent)]"
          />
          <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
            <div className="mb-6 flex justify-center">
              <Badge className="gap-1.5 px-3 py-1 text-sm">
                <Sparkles className="size-3.5" />
                Compliance affitti brevi · Italia
              </Badge>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Affitti brevi in regola,{" "}
              <RotatingWord words={["senza stress", "in automatico", "a prova di sanzione"]} />
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">
              Norma registra gli ospiti, genera e invia le schedine ad Alloggiati Web della Polizia
              di Stato e tiene d'occhio le scadenze. Tu pensi agli ospiti, alla burocrazia pensa
              Norma.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                Prova Norma gratis
                <ArrowRight />
              </Link>
              <a
                href="#come-funziona"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                Guarda come funziona
              </a>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              {PRICING.trial} · senza carta di credito.
            </p>

            <ul className="text-muted-foreground mx-auto mt-10 flex max-w-3xl flex-col flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:flex-row">
              {[
                "Invio diretto al web service",
                "Nessun doppione irreversibile",
                "Pronto in meno di 5 minuti",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Striscia trust */}
          <div className="border-border/60 border-y">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
              {TRUST.map((t) => (
                <span key={t} className="text-muted-foreground text-xs font-medium tracking-wide">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-8 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-primary text-5xl font-semibold tracking-tight">{s.value}</div>
                <p className="text-muted-foreground mx-auto mt-3 max-w-xs text-sm text-pretty">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mx-auto mt-14 max-w-3xl text-center text-lg text-pretty">
            La registrazione degli ospiti è un obbligo di legge e l'invio ad Alloggiati Web è{" "}
            <span className="text-foreground font-medium">irreversibile</span>: una schedina
            sbagliata o dimenticata può costare una sanzione. Norma sposta tutto il peso sulla{" "}
            <span className="text-foreground font-medium">validazione prima dell'invio</span> e su
            un invio prudente, così non emetti mai una schedina sbagliata o doppia.
          </p>
        </section>

        {/* PRODOTTI / MODULI */}
        <section id="prodotti" className="border-border/60 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">
                Una piattaforma, tutti gli adempimenti
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Tutto ciò che la legge ti chiede, in un posto solo
              </h2>
              <p className="text-muted-foreground mt-4 text-pretty">
                Si parte dall'invio ad Alloggiati Web. Dagli stessi dati ospiti, Norma coprirà
                presto anche gli altri adempimenti degli affitti brevi.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {MODULES.map((m) => (
                <Card key={m.name} className="flex flex-col p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
                      <m.icon className="size-5" />
                    </div>
                    {m.status === "attivo" ? (
                      <Badge variant="success">Attivo</Badge>
                    ) : (
                      <Badge variant="warning">In arrivo</Badge>
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{m.name}</h3>
                  <p className="text-muted-foreground mt-2 text-sm text-pretty">{m.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="funzionalita" className="border-border/60 bg-muted/30 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">
                Il nostro vantaggio
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Tutto ciò che serve per dormire tranquillo
              </h2>
              <p className="text-muted-foreground mt-4 text-pretty">
                Norma non è un modulo da compilare: è il motore che parla con la Polizia di Stato al
                posto tuo, con le garanzie giuste.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title} className="p-6 transition-shadow hover:shadow-md">
                  <div className="bg-primary/10 text-primary mb-4 flex size-11 items-center justify-center rounded-lg">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold tracking-tight">{f.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm text-pretty">{f.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section
          id="come-funziona"
          className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Come funziona
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Dal check-in alla Questura, in sei passi
            </h2>
            <p className="text-muted-foreground mt-4 text-pretty">
              Un percorso lineare, pensato per chi gestisce gli affitti brevi — non per chi scrive
              software.
            </p>
          </div>

          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-border/60 bg-card relative rounded-xl border p-6">
                <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold tracking-tight">{s.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm text-pretty">{s.description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex justify-center">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Inizia ora
              <ArrowRight />
            </Link>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-border/60 bg-muted/30 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">
                Dicono di noi
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Host e gestori che hanno smesso di preoccuparsi
              </h2>
              <p className="text-muted-foreground mt-4 text-sm">
                Esempi illustrativi: scenari d'uso realistici, non recensioni di clienti reali.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="flex flex-col p-6">
                  <Quote className="text-primary/40 size-6" />
                  <p className="mt-3 flex-1 text-sm text-pretty">{t.quote}</p>
                  <div className="mt-5">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {STORIES.map((t) => (
                <Card key={t.name} className="bg-card flex flex-col p-7">
                  <Quote className="text-primary/40 size-7" />
                  <p className="mt-3 flex-1 text-pretty">{t.quote}</p>
                  <div className="mt-6">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-muted-foreground text-sm">{t.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Il team
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Le persone dietro Norma
            </h2>
            <p className="text-muted-foreground mt-4 text-pretty">
              Per ora siamo in uno: chi conosce da vicino sia il rigore della finanza sia la fatica
              quotidiana degli affitti brevi.
            </p>
          </div>

          <Card className="mx-auto mt-14 grid max-w-4xl overflow-hidden sm:grid-cols-[minmax(0,1fr)_1.4fr]">
            <div className="bg-muted relative aspect-[4/5] sm:aspect-auto">
              <Image
                src="/team/gianluca.png"
                alt="Gianluca, fondatore di Norma"
                fill
                sizes="(min-width: 640px) 40vw, 100vw"
                className="object-cover object-top"
                priority
              />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <h3 className="text-xl font-semibold tracking-tight">Gianluca</h3>
              <p className="text-primary text-sm font-medium">Fondatore · Norma</p>
              <p className="text-muted-foreground mt-4 text-pretty">
                Investment banker e host: oltre{" "}
                <span className="text-foreground font-medium">
                  4 anni di esperienza diretta negli affitti brevi
                </span>
                . Conosco sia la disciplina con cui in finanza si gestisce il rischio — nessun
                errore, nessuna scorciatoia, tutto tracciato — sia la fatica quotidiana di check-in
                e schedine. Ho costruito Norma per togliere di mezzo la burocrazia, con le garanzie
                giuste.
              </p>
            </div>
          </Card>
        </section>

        {/* PRICING */}
        <section id="prezzi" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Inizia ora
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Un prezzo onesto, senza sorprese
            </h2>
            <p className="text-muted-foreground mt-4 text-pretty">
              Gli affitti brevi li gestisci tutto l'anno: niente costi a schedina, niente vincoli.
            </p>
          </div>

          <div className="mt-14 grid items-start gap-6 lg:grid-cols-2">
            {PRICING_PLANS.map((plan) => {
              const highlighted = plan.highlighted;
              return (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative flex flex-col p-8",
                    highlighted ? "bg-primary text-primary-foreground shadow-lg" : "shadow-sm",
                  )}
                >
                  {highlighted && (
                    <span className="bg-primary-foreground text-primary absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow">
                      Consigliato
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-lg",
                          highlighted ? "bg-primary-foreground/15" : "bg-primary/10 text-primary",
                        )}
                      >
                        <ShieldCheck className="size-5" />
                      </span>
                      <span className="font-semibold tracking-tight">{plan.name}</span>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        highlighted ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {plan.scope}
                    </span>
                  </div>

                  <div className="mt-8 flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                    {plan.priceUnit && (
                      <span
                        className={cn(
                          "pb-1 text-sm",
                          highlighted ? "opacity-80" : "text-muted-foreground",
                        )}
                      >
                        {plan.priceUnit}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-3 text-sm/relaxed",
                      highlighted ? "opacity-90" : "text-muted-foreground",
                    )}
                  >
                    {plan.tagline}
                  </p>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                            highlighted ? "bg-primary-foreground/20" : "bg-success/15 text-success",
                          )}
                        >
                          <Check className="size-3.5" />
                        </span>
                        <span className="text-pretty">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.cta.href}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-8",
                      highlighted &&
                        "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
                    )}
                  >
                    {plan.cta.label}
                    <ArrowRight />
                  </Link>
                  {highlighted && (
                    <p className="mt-3 text-xs opacity-70">
                      {PRICING.trial} · {PRICING.trialNote}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          <p className="text-muted-foreground mt-6 text-center text-sm">{PRICING.vatNote}</p>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-border/60 bg-muted/30 border-t">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                FAQ
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Domande frequenti
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.question}
                  className="border-border/60 bg-card group rounded-xl border px-5 [&_summary]:list-none"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 font-medium">
                    {f.question}
                    <ChevronDown className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="text-muted-foreground pb-4 text-sm text-pretty">{f.answer}</p>
                </details>
              ))}
            </div>

            <div className="mt-12 text-center">
              <h3 className="font-semibold tracking-tight">Non trovi la tua domanda?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Scrivici: rispondiamo entro 24 ore.
              </p>
              <a
                href="mailto:ciao@norma.casa"
                className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
              >
                Contatta il team
              </a>
            </div>
          </div>
        </section>

        {/* CTA finale */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Card className="from-primary to-primary/80 relative overflow-hidden bg-linear-to-br p-10 text-center sm:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklch,white_18%,transparent),transparent)]"
            />
            <h2 className="text-primary-foreground relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Il prossimo ospite, già in regola
            </h2>
            <p className="text-primary-foreground relative mx-auto mt-4 max-w-xl text-pretty opacity-90">
              Collega la tua credenziale Alloggiati Web e invia la prima schedina oggi stesso.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-background text-foreground hover:bg-background/90",
                )}
              >
                Prova Norma gratis
                <ArrowRight />
              </Link>
            </div>
          </Card>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-border/60 border-t">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="text-muted-foreground mt-4 max-w-xs text-sm text-pretty">
              La compliance degli affitti brevi in Italia, automatizzata: Alloggiati Web e
              adempimenti, senza pensieri.
            </p>
          </div>

          <FooterCol
            title="Prodotto"
            links={[
              { href: "#funzionalita", label: "Funzionalità" },
              { href: "#come-funziona", label: "Come funziona" },
              { href: "#prezzi", label: "Prezzi" },
            ]}
          />
          <FooterCol
            title="Risorse"
            links={[
              { href: "#faq", label: "FAQ" },
              { href: "/login", label: "Accedi" },
              { href: "/login", label: "Prova gratis" },
            ]}
          />
          <FooterCol
            title="Contatti"
            links={[
              { href: "mailto:ciao@norma.casa", label: "ciao@norma.casa" },
              { href: "#", label: "Privacy" },
              { href: "#", label: "Termini" },
            ]}
          />
        </div>
        <div className="border-border/60 border-t">
          <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row sm:px-6">
            <span>
              © {new Date().getFullYear()} Norma · norma.casa — Tutti i diritti riservati.
            </span>
            <span>Fatto in Italia per gli affitti brevi.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={`${title}-${l.label}`}>
            <Link
              href={l.href}
              className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-sm transition-colors"
            >
              {l.label}
              <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

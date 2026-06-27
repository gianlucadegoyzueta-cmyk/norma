import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import {
  ANNUAL_PLAN,
  MONTHLY_PLAN,
  formatEuroCents,
  type AccessDecision,
  type AccessState,
  type PlanDefinition,
} from "@/server/modules/billing";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingStripeButton } from "./BillingStripeButton";
import { loadBillingView } from "./_lib/billing";

export const metadata: Metadata = { title: "Abbonamento" };
export const dynamic = "force-dynamic";

const STATE_BADGE: Record<AccessState, { text: string; cmx: string }> = {
  TRIAL: { text: "Prova gratuita", cmx: "cmx-badge-wait" },
  SUBSCRIBED: { text: "Attivo", cmx: "cmx-badge-ok" },
  GRACE: { text: "Da regolarizzare", cmx: "cmx-badge-wait" },
  EXPIRED: { text: "Scaduto", cmx: "cmx-badge-err" },
};

function stateHeadline(access: AccessDecision): { title: string; description: string } {
  switch (access.state) {
    case "TRIAL":
      return {
        title: "Sei in prova gratuita",
        description:
          "Norma è gratis fino al tuo primo ospite gestito. Nessuna carta richiesta: " +
          "abbónati quando vuoi per non interromperti al primo check-in.",
      };
    case "SUBSCRIBED":
      return {
        title: "Abbonamento attivo",
        description:
          "Grazie! Hai accesso completo a Norma. Puoi gestire o disdire quando vuoi dal portale.",
      };
    case "GRACE":
      return access.graceReason === "PAYMENT_PAST_DUE"
        ? {
            title: "Pagamento in sospeso",
            description:
              "Non siamo riusciti ad incassare l'ultimo rinnovo. Aggiorna il metodo di pagamento " +
              "per non perdere l'accesso: nel frattempo continui a lavorare normalmente.",
          }
        : {
            title: "È ora di abbonarti",
            description:
              "Hai gestito il tuo primo ospite: per continuare a scrivere servirà l'abbonamento. " +
              "Hai ancora qualche giorno di grazia per non interromperti.",
          };
    case "EXPIRED":
      return {
        title: "Abbonamento necessario",
        description:
          "La prova è terminata. Puoi sempre CONSULTARE i tuoi dati, ma per inviare schedine, " +
          "calcolare la tassa e gestire gli ospiti serve un abbonamento attivo.",
      };
  }
}

function PlanCard({ plan, configured }: { plan: PlanDefinition; configured: boolean }) {
  return (
    <Card className={plan.recommended ? "border-primary" : undefined} style={{ borderRadius: 18 }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.interval === "year" ? "Annuale" : "Mensile"}</CardTitle>
          {plan.recommended && <span className="cmx-badge cmx-badge-go">Consigliato</span>}
        </div>
        <CardDescription>
          <span className="text-foreground text-2xl font-semibold">
            {formatEuroCents(plan.amountCents)}
          </span>{" "}
          / {plan.interval === "year" ? "anno" : "mese"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BillingStripeButton
          mode="checkout"
          plan={plan.plan}
          configured={configured}
          label="Abbónati"
          variant={plan.recommended ? "default" : "outline"}
        />
      </CardContent>
    </Card>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { checkout } = await searchParams;
  const { access, subscription, ready, configured } = await loadBillingView(
    ctx.current.organizationId,
  );
  const headline = access ? stateHeadline(access) : null;
  const hasCustomer = Boolean(subscription?.stripeCustomerId);
  // Risparmio annuale reale, derivato dai prezzi: niente claim a mano che può mentire.
  const annualSaving = MONTHLY_PLAN.amountCents * 12 - ANNUAL_PLAN.amountCents;
  const monthsFree = Math.round(annualSaving / MONTHLY_PLAN.amountCents);

  return (
    <ConciergePage
      dense
      active="billing"
      kicker="ABBONAMENTO · NORMA"
      title="Abbonamento"
      intro="Il piano di Norma e lo stato del tuo abbonamento."
    >
      <div className="cmx-section space-y-6" style={{ marginTop: 0 }}>
        {checkout === "success" && (
          <Card className="border-success/40 bg-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="text-success" />
                Pagamento ricevuto
              </CardTitle>
              <CardDescription>
                Sto attivando il tuo abbonamento. Se qui sotto lo stato non è ancora «Attivo», si
                aggiorna entro pochi istanti.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {checkout === "cancel" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamento annullato</CardTitle>
              <CardDescription>Nessun addebito. Puoi riprovare quando vuoi.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {!configured && (
          <Card className="border-warning/40 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="text-warning-foreground" />
                Pagamenti non ancora configurati
              </CardTitle>
              <CardDescription>
                Le chiavi Stripe non sono impostate su questo ambiente: i pulsanti di pagamento sono
                disattivati. Configura le variabili d&apos;ambiente su Vercel.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!ready && (
          <Card className="border-warning/40 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TriangleAlert className="text-warning-foreground" />
                Billing in attesa di attivazione
              </CardTitle>
              <CardDescription>
                La tabella degli abbonamenti non è ancora stata creata (migrazione parcheggiata).
                Una volta applicata, questa pagina mostrerà lo stato reale.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {access && headline && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {access.state === "SUBSCRIBED" && <CheckCircle2 className="text-success" />}
                  {headline.title}
                </CardTitle>
                <span className={`cmx-badge ${STATE_BADGE[access.state].cmx}`}>
                  {STATE_BADGE[access.state].text}
                </span>
              </div>
              <CardDescription>{headline.description}</CardDescription>
            </CardHeader>
            {access.graceEndsAt && (
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Periodo di grazia fino al{" "}
                  {access.graceEndsAt.toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* L'upsell del piano serve solo a chi NON è già abbonato: a un abbonato attivo mostriamo
            il portale (sotto) per cambiare cadenza o metodo, non un nuovo "Abbónati". */}
        {access?.state !== "SUBSCRIBED" && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Scegli il piano</h2>
            <p className="text-muted-foreground text-sm">
              {annualSaving > 0
                ? `Con l'annuale risparmi ${formatEuroCents(annualSaving)} l'anno rispetto al mensile — circa ${monthsFree} ${monthsFree === 1 ? "mese" : "mesi"} gratis.`
                : "Scegli la cadenza che preferisci: cambi quando vuoi."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <PlanCard plan={ANNUAL_PLAN} configured={configured} />
              <PlanCard plan={MONTHLY_PLAN} configured={configured} />
            </div>
          </section>
        )}

        {hasCustomer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestisci l&apos;abbonamento</CardTitle>
              <CardDescription>
                Metodo di pagamento, fatture e disdetta dal portale sicuro di Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingStripeButton
                mode="portal"
                configured={configured}
                label="Apri il portale clienti"
                variant="outline"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </ConciergePage>
  );
}

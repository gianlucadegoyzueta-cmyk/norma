// Webhook Stripe. Riceve il body GREZZO (serve per la verifica firma) e la signature.
//  - firma non valida / mancante → 400 (Stripe NON ritenta: non è un errore transitorio);
//  - errore applicativo → 500 (Stripe ritenta naturalmente);
//  - ok / duplicato / ignorato → 200.
// L'idempotenza per event.id è gestita dal servizio (ProcessedEventStore).

import { NextResponse } from "next/server";
import { BillingNotConfiguredError } from "@/server/modules/billing";
import { webhookService } from "@/app/billing/_lib/billing";

// Body grezzo necessario alla verifica firma: niente cache, runtime Node (crypto Stripe).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const result = await webhookService().handle(rawBody, signature);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      // Chiavi mancanti: non è colpa di Stripe, niente retry utile → 400 con messaggio chiaro.
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    // Firma non valida → Stripe lancia un errore di verifica: 400 (no retry).
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    if (/signature|timestamp|webhook/i.test(message)) {
      return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
    }
    // Errore applicativo (es. DB): 500 → Stripe ritenta.
    console.error("[stripe-webhook] errore nel processare l'evento:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

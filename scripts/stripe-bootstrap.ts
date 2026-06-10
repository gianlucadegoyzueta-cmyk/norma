/**
 * Bootstrap dei prodotti/prezzi Stripe per Norma (TEST MODE).
 *
 * Idempotente: cerca PRIMA di creare (per metadata sul Product, per `lookup_key` sui Price),
 * così può essere rilanciato senza duplicare nulla.
 *
 * Uso (con le TUE chiavi di test):
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-bootstrap.ts
 *
 * Crea:
 *   - Product "Norma" (metadata app=norma)
 *   - Price annuale €120/anno  (lookup_key: norma_annual_v1)  ← consigliato
 *   - Price mensile  €14/mese   (lookup_key: norma_monthly_v1)
 */

import Stripe from "stripe";
import {
  BILLING_CURRENCY,
  NORMA_PRODUCT_NAME,
  PLANS,
  type PlanDefinition,
} from "../src/server/modules/billing/domain/plan";

const PRODUCT_METADATA_KEY = "app";
const PRODUCT_METADATA_VALUE = "norma";

async function ensureProduct(stripe: Stripe): Promise<string> {
  const found = await stripe.products.search({
    query: `metadata['${PRODUCT_METADATA_KEY}']:'${PRODUCT_METADATA_VALUE}' AND active:'true'`,
    limit: 1,
  });
  if (found.data[0]) {
    console.log(`✓ Product già presente: ${found.data[0].id} (${found.data[0].name})`);
    return found.data[0].id;
  }
  const product = await stripe.products.create({
    name: NORMA_PRODUCT_NAME,
    description: "Compliance affitti brevi: schedine, tassa di soggiorno, ISTAT, CIN, check-in.",
    metadata: { [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE },
  });
  console.log(`＋ Product creato: ${product.id}`);
  return product.id;
}

async function ensurePrice(stripe: Stripe, productId: string, plan: PlanDefinition): Promise<void> {
  const existing = await stripe.prices.list({
    lookup_keys: [plan.lookupKey],
    active: true,
    limit: 1,
  });
  const current = existing.data[0];
  if (current) {
    const sameAmount = current.unit_amount === plan.amountCents;
    const sameInterval = current.recurring?.interval === plan.interval;
    if (sameAmount && sameInterval) {
      console.log(`✓ Price già presente: ${plan.lookupKey} (${current.id})`);
      return;
    }
    console.log(
      `! Price ${plan.lookupKey} esiste ma differisce (importo/intervallo): ne creo uno nuovo ` +
        `e gli trasferisco la lookup_key.`,
    );
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: BILLING_CURRENCY,
    unit_amount: plan.amountCents,
    recurring: { interval: plan.interval },
    lookup_key: plan.lookupKey,
    transfer_lookup_key: true,
    nickname: plan.label,
  });
  console.log(`＋ Price creato: ${plan.lookupKey} (${price.id}) = ${plan.amountCents} cent`);
}

async function main(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error(
      "STRIPE_SECRET_KEY mancante. Esegui con: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-bootstrap.ts",
    );
    process.exit(1);
  }
  if (!secretKey.startsWith("sk_test_")) {
    console.error("Per sicurezza questo script accetta SOLO chiavi di test (sk_test_...).");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  console.log("Bootstrap Stripe (TEST MODE) per Norma…\n");
  const productId = await ensureProduct(stripe);
  for (const plan of PLANS) {
    await ensurePrice(stripe, productId, plan);
  }
  console.log("\nFatto. lookup_keys disponibili:", PLANS.map((p) => p.lookupKey).join(", "));
}

main().catch((err) => {
  console.error("Bootstrap fallito:", err);
  process.exit(1);
});

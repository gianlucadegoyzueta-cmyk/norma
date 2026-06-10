# Migrazioni parcheggiate

Migrazioni **generate ma NON applicate** dalle corse notturne non autorizzate a migrare
lo schema (vedi `CLAUDE.md` → "Regole flotta": una sola corsia per notte migra).

Non vivono sotto `prisma/migrations/` apposta: così un `prisma migrate deploy` accidentale
NON le applica.

## Come attivarne una (umano / corsia autorizzata)

1. Backup fresco: `~/bin/norma-backup.sh` e verifica `backup.log` (guardrail 2).
2. Sposta la cartella della migrazione sotto `prisma/migrations/`.
3. `npm run db:deploy`.

## In sospeso

- `20260610000000_add_billing_subscription/` — modello `Subscription` + `ProcessedStripeEvent`
  (+ enum `SubscriptionStatus`, `BillingPlan`) per il billing Stripe (corsia B, PR billing).

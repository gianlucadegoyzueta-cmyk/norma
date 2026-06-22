# Billing (Stripe) — CHANGELOG e note operative

Modulo in stile esagonale (ports/adapters), come `tourist-tax`/`alloggiati`. Dominio PURO e
massimamente testato; ogni effetto (Stripe, DB) dietro porta. Denaro sempre in centesimi.
Isolamento multi-tenant per `organizationId`. Tutto pensato per la **sandbox Stripe (test mode)**.

## Cosa fa

- **Incasso** in TEST MODE via Stripe Checkout (hosted) + Customer Portal (gestione/disdetta).
  Nessun form carte custom: PCI a carico di Stripe.
- **Modello commerciale (decisione founder 2026-06-20):** annuale-first — €90/anno consigliato (`norma_annual_v2`),
  €9/mese rampa (`norma_monthly_v2`). Agenzie/PM: €6/mese a struttura (€72/anno) — vetrina sul sito marketing.
  NB: il bump dei lookup_key a `_v2` fa creare Price nuovi su Stripe al bootstrap (i vecchi €120/€14 non vengono riusati).
- **Trial legato al PRIMO UTILIZZO, non al tempo:** accesso pieno e senza carta finché gli ospiti
  gestiti sono 0; al primo ospite scatta la richiesta di abbonamento, con 7 giorni di grazia. È
  logica applicativa (`domain/access.ts`), NON un trial Stripe a giorni.

## Struttura

- `domain/` (puro): `plan.ts` (catalogo + lookup_key + formattazione €), `stripe-mapping.ts`
  (status/price → enum locali), `access.ts` (gating: TRIAL/SUBSCRIBED/GRACE/EXPIRED; lettura
  sempre permessa), `webhook.ts` (reducer evento → patch stato).
- `ports/`: `BillingGateway`, `SubscriptionRepository`, `ProcessedEventStore` (idempotenza per
  `event.id`), `GuestActivity` (definisce cosa conta come "ospite gestito": v1 = righe `Guest`).
- `adapters/`: `StripeBillingGateway` (unico file con l'SDK; verifica FIRMA webhook), `InMemory*`
  (test), `Prisma*` (prod; `Subscription`/`ProcessedStripeEvent` dipendono dalla migrazione
  parcheggiata), `PrismaGuestActivityRepository` (usa `Guest`, già esistente).
- `services/`: `checkout.service` (Checkout/Portal), `webhook.service` (firma → idempotenza →
  upsert), `gating.service` (`getAccess` + guard `requireWriteAccess`).

## Wiring app

- Pagina `/billing` (stato + piani + bottoni, disabilitati senza chiavi) e server action
  `startCheckoutAction`/`openPortalAction` in `src/app/billing/`.
- Webhook `POST /api/webhooks/stripe`: 400 firma non valida (no retry), 500 errore applicativo
  (retry Stripe naturale), 200 ok/duplicate/ignored. Rotta pubblica in `paths.ts`.
- Composition root difensivo in `src/app/billing/_lib/billing.ts` (degrada se la tabella manca, P2021).

## Schema / migrazione

Modelli `Subscription` (1:1 Organization; `quantity` predisposto per fasce per n° immobili) +
`ProcessedStripeEvent`, enum `SubscriptionStatus`/`BillingPlan`. Migrazione **generata ma
PARCHEGGIATA** in `prisma/migrations-parked/` (non sotto `prisma/migrations/`). Attivazione e
chiavi: vedi `NEEDS-HUMAN.md` #8.

# Corsia B — Billing Stripe (sandbox)

**Obiettivo:** Norma sa incassare. Tutto in TEST MODE (account "Norma sandbox" già esistente).

## Decisioni di prodotto (GIÀ PRESE — fonte: Piano Marketing su Drive, maggio 2026)

- **Annuale-first:** piano "Norma" — €120/anno per struttura in evidenza (≈€10/mese);
  €14/mese come rampa di fiducia (volutamente meno conveniente, spinge l'annuale).
- **Trial legato al primo utilizzo, NON a tempo:** gratis fino al primo ospite gestito,
  senza carta. Implementazione: il gating NON usa i trial Stripe a giorni — è logica
  applicativa (accesso pieno finché count ospiti gestiti == 0; al primo ospite completato
  scatta la richiesta di abbonamento, con grazia ragionevole per non interrompere il flusso).
- NB: il sito marketing dice "€12/mese" — disallineamento noto, lo risolve Gianluca
  (il prezzo pubblico va aggiornato al modello annuale-first). Non bloccare su questo.
- Flusso: Stripe Checkout (hosted) per subscribe; Customer Portal per gestione/disdetta.
  NIENTE form carte custom (PCI a carico di Stripe).
- Webhook `/api/webhooks/stripe`: checkout.session.completed, customer.subscription.updated/
  deleted, invoice.payment_failed → stato locale `Subscription` (per User: status, periodo,
  stripeCustomerId, stripeSubscriptionId).
- Gating: middleware/guard — trial attivo o abbonamento attivo = accesso pieno; scaduto =
  banner + blocco azioni di scrittura (lettura sempre permessa: i dati sono dell'host).
- Niente migrazione schema in questa corsia se possibile: se serve il modello Subscription,
  COORDINATI: scrivi la migration SQL ma NON applicarla — lascia la PR aperta con label e
  nota in NEEDS-HUMAN (la corsia A è l'unica autorizzata a migrare stanotte). Alternativa
  preferita: progetta il modello e implementa tutto dietro interfaccia con repo in-memory +
  Prisma repo pronto, migration generata ma parcheggiata.

## Vincoli tecnici

- SDK `stripe` ufficiale. Chiavi da env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — NON le hai: usa mock nei test, documenta in
  NEEDS-HUMAN cosa deve incollare Gianluca in .env e su Vercel (test mode).
- Verifica firma webhook obbligatoria, idempotenza per event.id (tabella o cache in-memory
  con nota), errori → 500 con retry Stripe naturale.
- Prezzi/prodotti: crea uno script `scripts/stripe-bootstrap.ts` che crea Product/Price
  in test mode (idempotente, cerca prima di creare): price annuale €120 + price mensile €14
  — Gianluca lo lancerà con le sue chiavi.
- Struttura a fasce per numero di immobili: PREDISPONI il modello (quantity per struttura)
  ma fascia unica per ora.

## Definition of done

Domain (stati abbonamento, gating) puro e testato · webhook handler testato con eventi
finti firmati · UI: pagina /billing con stato, bottoni Checkout/Portal (disabilitati senza
chiavi, con messaggio chiaro) · CI verde · PR (merge ok se zero migrazioni applicate) ·
NEEDS-HUMAN aggiornato con i passi-chiavi · NIGHT-LOG aggiornato.

# Corsia Partner Channel — tracking referral nell'app (decisione founder 12/6)

Canale a costo variabile puro: 20% ricorrente su incassato, un livello. Qui la parte APP.

## Cosa costruire (branch feat/partner-tracking) · HIGH (schema + soldi) · PR + merge SOLO
con migrazione additiva e backup verificato (guardrail 2); il PAYOUT resta manuale per ora.

1. **Modello** (migrazione additiva): `Partner` (id, nome, email, codice univoco, percentuale
   default 20, scelta: REVSHARE|SCONTO_CLIENTI, createdAt) + campo `partnerId?` su
   Organization (nullable). NIENTE automazione pagamenti: i payout si calcolano e basta.
2. **Attribuzione**: al signup, campo facoltativo "Codice partner" (o ?ref= in URL,
   persistito); al checkout Stripe → metadata partnerId/codice sul customer/subscription.
   Se il partner ha scelto SCONTO_CLIENTI: applica coupon Stripe -20% (crea coupon
   `partner-20` idempotente nello script bootstrap).
3. **Conteggi**: pagina admin minimale (o anche solo query documentata + sezione in
   /credentials per ora) che mostra per partner: clienti attivi, incassato attribuito
   (da webhook invoice.paid già gestiti), 20% maturato per trimestre. Trasparenza > UI.
4. **Test** completi su attribuzione e calcolo. Mai loggare email partner in chiaro.

NB sequenza: il canale si APRE in Fase 2 (decisione piano marketing). Costruirlo ora =
essere pronti; nessuna pagina pubblica lo annuncia finché il founder non attiva M2.

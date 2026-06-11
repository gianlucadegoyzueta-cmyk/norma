# Corsia F — Email transazionali check-in (il tessuto connettivo mancante)

**Contesto:** RESEND_API_KEY ed EMAIL_FROM esistono già in produzione (Vercel) — scopri
come il codice invia oggi (cerca nodemailer/resend nel repo: probabile uso per il reset
password) e RIUSA quel canale. In locale la chiave può mancare: transport mock nei test,
degradazione con messaggio chiaro in dev.

## Cosa costruire

1. **Modulo notifications** (`src/server/modules/notifications/`): domain puro (composizione
   messaggi) + port EmailSender + adapter sul canale esistente. Template (IT + EN):
   a) **Invito check-in**: "Benvenuto! Per il tuo soggiorno a [struttura] completa il
      check-in qui: [link]" — tono Norma, niente hype, footer sobrio.
   b) **Promemoria check-in** (arrivo ≤72h e check-in non completato): gentile, una volta sola.
2. **Azione manuale in UI**: sul soggiorno (/stays/[id] o dove vive il check-in link):
   bottone "Invia link via email" se esiste un'email di contatto della prenotazione.
   **NIENTE invii automatici**: solo su click dell'host (i cron sono congelati).
   Dopo l'invio: feedback visivo in stile Concierge (timbro "INVIATA ✓" sobrio).
3. **Tracciamento minimo**: campo/log di quando l'invito è stato inviato (se serve schema:
   migrazione SOLO additiva — backup verificato prima del merge, guardrail 2 — oppure
   riusa campi esistenti se ci sono).

## Vincoli

- Verifica PRIMA se il modello prenotazione/stay ha un'email di contatto. Se non c'è:
  campo nullable additivo (migrazione con backup) oppure input manuale dell'email al
  momento dell'invio — scegli la via più semplice e documentala in DECISIONS.
- Mai loggare indirizzi email in chiaro nei log applicativi.
- Test: composizione template (snapshot IT/EN), adapter con transport mock, niente
  chiamate reali a Resend in test/CI.
- CI completa verde → merge consentito (feature additiva, azione solo manuale).
- Aggiorna NIGHT-LOG e, se scelte non banali, DECISIONS.

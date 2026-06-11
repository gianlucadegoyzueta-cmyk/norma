# Coda notturna 2 — "Le 7 del founder" (approvate 12/6, goal: attivazione piloti interni)

Regole: zero migrazioni schema (tutto si calcola da dati esistenti) · classi di rischio
dichiarate · rebase pre-push · screenshot before/after per le unità UI · output template
nel PR body. La dashboard (#71) è di un'altra corsia: NON toccare src/app/dashboard.

## G1 — Fiducia nei dati (branch feat/stay-timeline-export) · MEDIUM · merge se CI verde

a) **Timeline del soggiorno**: nella pagina del soggiorno, storia verticale end-to-end con
   gli eventi reali: importato da iCal / creato · check-in ospite (quando) · schedina
   preparata · confermata · acquisita dalla Questura (ricevuta n.) · tassa conteggiata.
   Stile concierge: nodi salvia, timestamp mono, "Norma:" sulle azioni sue. Solo dati
   esistenti (stati outbox, ricevute, checkin) — niente campi nuovi.
b) **Esporta tutto**: in /credentials o impostazioni, bottone "Esporta i tuoi dati" → zip
   (o singoli CSV) con soggiorni, ospiti (campi non sensibili dove serve), tasse, ISTAT.
   Copy: "I dati sono tuoi, sempre." Riusa gli export esistenti, aggiungi i mancanti.

## G2 — Interfaccia veloce (branch feat/cmdk-mobile) · MEDIUM · merge se CI verde

a) **⌘K command palette**: navigazione (tutte le sezioni) + azioni rapide (nuovo soggiorno,
   sincronizza iCal, copia link check-in dell'arrivo imminente). Libreria leggera (cmdk) o
   custom — coerente coi token. Scorciatoia ⌘K/ctrl-K + bottone discreto nell'header.
b) **Mobile + PWA**: manifest.json (icona sigillo, nome Norma, theme avorio), viewport e
   meta iOS, bottom-bar mobile con le 4 sezioni chiave + FAB concierge. Niente service
   worker complesso: basta installabilità + navigazione decente da telefono.

## G3 — Ritmo e fiducia nel tempo (branch feat/digest-score) · HIGH (email out + cron nuovo)
**→ PR APERTA, NON MERGIARE** (decide il founder: introduce un cron settimanale — separato
e distinto dal cron invii congelato, ma è comunque email automatica in uscita)

a) **Digest settimanale "Fatto da Norma"**: email lunedì 9:00 (template sul canale Resend
   esistente, riusa notifications): cosa ha fatto Norma nella settimana (conteggi reali),
   cosa serve questa settimana, posizione regolare sì/no. Route /api/cron/digest con flag
   DIGEST_ENABLED default OFF + secret — pattern identico al cron alloggiati ma flag separato.
b) **Storico compliance**: vista mensile "posizione regolare" (calcolata retroattivamente
   dai dati: schedine acquisite vs attese, tasse dichiarate): righe mese ✓/⚠ stile registro.

## G4 — Wizard iCal (branch feat/ical-wizard) · MEDIUM · merge se CI verde

Import iCal con anteprima: incolli URL → Norma mostra le prenotazioni trovate (date, ospiti
presunti, struttura) PRIMA di importare → confermi → import con riepilogo. Stati di errore
gentili (URL sbagliato, calendario vuoto). Migliora il flusso esistente, non lo duplica.

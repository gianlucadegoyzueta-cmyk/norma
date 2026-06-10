# Corsia A — Import iCal prenotazioni (Airbnb/Booking/VRBO)

**Obiettivo:** le prenotazioni entrano in Norma da sole. L'host incolla l'URL iCal del
calendario (Airbnb/Booking lo espongono per struttura) e Norma crea/aggiorna i soggiorni.

## Decisioni di prodotto (GIÀ PRESE — non rimetterle in discussione)

- Modello: `ReservationImport` (sorgente per property: url, tipo, lastSyncAt, status) +
  le prenotazioni importate diventano `Stay` in stato bozza ("da completare con ospiti").
- Un evento iCal = un soggiorno: usa UID iCal come chiave di dedup (upsert su re-sync).
- Eventi cancellati dal feed → lo Stay bozza viene marcato annullato SOLO se ancora bozza;
  se l'host l'ha già arricchito (ospiti inseriti), flag "verifica annullamento" e non toccare.
- Sync: manuale (bottone "Sincronizza ora") + endpoint interno richiamabile. NIENTE cron
  in questa unità (gli invii/cron sono congelati — vedi CLAUDE.md ⛔).
- Parser: libreria `node-ical` (o parsing manuale RFC5545 se la lib è troppo pesante —
  valuta tu, ma niente dipendenze con binari nativi: deve girare su Vercel).
- UI: sezione in /properties/[id]: aggiungi/rimuovi URL iCal, stato ultimo sync, lista
  prenotazioni importate in bozza. Copy in italiano, tono Norma (sobrio, concreto).

## Migrazione schema (UNICA corsia autorizzata stanotte)

- Additiva-only: nuova tabella ReservationImport + campi nullable su Stay (es. icalUid,
  importSource). VIETATO: drop, rename, alter di colonne esistenti.
- **PROVA LA MIGRAZIONE IN LOCALE PRIMA** (docker è disponibile via colima):
  `docker compose up -d db` nel worktree (porta già configurata in docker-compose.yml),
  punta un `.env.test-db` locale a quel Postgres, esegui `env NODE_ENV= npx prisma migrate dev`
  contro il DB locale, verifica che la migrazione applichi pulita e i test integrazione passino.
  Se la porta è occupata da un'altra corsia: cambia porta nel compose override locale (non committarlo).
- Prima del merge: esegui `~/bin/norma-backup.sh` e verifica l'ultima riga di
  `~/backups/norma/backup.log` (OK di oggi). La migrazione va in prod via migrate.yml al merge.
- `npx prisma validate` + typecheck + test completi prima della PR.

## Definition of done

Domain puro testato (parsing, dedup, regole annullamento) · adapter fetch iCal con timeout
e errori gestiti · UI con stati loading/error · CI verde · PR mergiata · NIGHT-LOG aggiornato.

// Reminder mensile del movimento turistico (Fase 1 — solo PREPARA + AVVISA, nessun invio agli enti).
// Per ogni struttura, alla scadenza (5 del mese) verifica lo stato del periodo precedente e manda
// all'host una email: file Ross1000 pronto da caricare, oppure l'elenco dei dati mancanti da
// completare in tempo. Per le regioni a formato non integrato (ASSISTITO) ricorda l'inserimento manuale.
//
// PURO/orchestrazione: dipendenze iniettate (lista strutture, loader Ross1000, email) → unit-testabile
// senza DB. Nessuna azione irreversibile: invia solo email all'host (gate d'attivazione nella route).

import type { EmailSender } from "../../notifications/ports";
import { periodLabel, periodOf, transmissionDeadline } from "../ross1000/period";
import { regionMovementForProvincia, type RegionSerializerId } from "../regional/routing";

/** Etichette leggibili dei campi mancanti del tracciato (per l'email all'host). */
const FIELD_LABELS: Record<string, string> = {
  struttura: "struttura non configurata",
  codice: "codice struttura Ross1000",
  cameredisponibili: "camere disponibili",
  lettidisponibili: "letti disponibili",
  cittadinanza: "cittadinanza ospite",
  statoresidenza: "stato di residenza ospite",
  luogoresidenza: "luogo di residenza ospite",
  tipoturismo: "tipo turismo",
  mezzotrasporto: "mezzo di trasporto",
  idcapo: "capogruppo",
  // campi specifici di altri tracciati (es. SPOT-Puglia)
  comuneresidenza: "comune di residenza ospite",
  paeseresidenza: "paese di residenza ospite",
  postilettodisponibili: "posti letto disponibili",
  leaderId: "capogruppo",
};

export interface ReminderProperty {
  organizationId: string;
  propertyId: string;
  name: string;
  provincia: string | null;
  ownerEmail: string | null;
}

/** Esito minimo che il reminder consuma da un loader regionale (Ross1000, SPOT, …). */
export type RegionalReportResult =
  | { kind: "OK" }
  | { kind: "INCOMPLETE"; missing: { field: string }[] };

export interface IstatReminderDeps {
  listProperties(): Promise<ReminderProperty[]>;
  /** Carica/prepara il report del periodo per la struttura, dispatchando sul serializer della regione. */
  loadReport(
    serializerId: RegionSerializerId,
    ids: { organizationId: string; propertyId: string },
    period: string,
  ): Promise<RegionalReportResult>;
  email: EmailSender;
}

export interface ReminderResult {
  period: string;
  orgsNotified: number;
  ready: number; // strutture FILE con report OK
  incomplete: number; // strutture FILE con dati mancanti
  assistito: number; // strutture in regione a inserimento manuale
  errored: number; // strutture il cui report ha lanciato (dati malformati) — isolate, non bloccano il batch
  skippedNoEmail: number; // org senza email owner
  emailFailed: number; // invii email falliti (isolati, non bloccano gli altri)
}

/** Periodo del mese PRECEDENTE rispetto a `now` (il movimento da dichiarare entro il 5). */
function previousPeriod(now: Date): string {
  return periodOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}

type Line = { kind: "ready" | "incomplete" | "assistito" | "errore"; text: string };

export async function runMonthlyIstatReminders(
  deps: IstatReminderDeps,
  now: Date,
): Promise<ReminderResult> {
  const period = previousPeriod(now);
  const deadline = transmissionDeadline(period); // 5 del mese corrente
  const label = periodLabel(period);

  const properties = await deps.listProperties();

  // Raggruppa per org, accumulando le righe del digest + contatori.
  const byOrg = new Map<string, { email: string | null; lines: Line[] }>();
  const res: ReminderResult = {
    period,
    orgsNotified: 0,
    ready: 0,
    incomplete: 0,
    assistito: 0,
    errored: 0,
    skippedNoEmail: 0,
    emailFailed: 0,
  };

  for (const p of properties) {
    const rm = regionMovementForProvincia(p.provincia);
    if (!rm) continue; // regione non riconosciuta → niente reminder (dato struttura da sistemare)

    const bucket = byOrg.get(p.organizationId) ?? { email: p.ownerEmail, lines: [] };

    if (rm.status === "FILE" && rm.serializerId) {
      // Isolamento per-struttura: loadReport può LANCIARE (es. campo fuori vincolo nel tracciato).
      // Una struttura malformata NON deve abortire il run mensile di tutte le altre.
      let out: RegionalReportResult;
      try {
        out = await deps.loadReport(
          rm.serializerId,
          { organizationId: p.organizationId, propertyId: p.propertyId },
          period,
        );
      } catch {
        res.errored += 1;
        bucket.lines.push({
          kind: "errore",
          text: `⚠ ${p.name} (${rm.label}): errore nel preparare il file — verifica i dati della struttura/ospiti.`,
        });
        byOrg.set(p.organizationId, bucket);
        continue;
      }
      if (out.kind === "OK") {
        res.ready += 1;
        bucket.lines.push({
          kind: "ready",
          text: `✓ ${p.name} (${rm.label}): file pronto da scaricare e caricare sul portale.`,
        });
      } else {
        res.incomplete += 1;
        const fields = [...new Set(out.missing.map((m) => FIELD_LABELS[m.field] ?? m.field))];
        bucket.lines.push({
          kind: "incomplete",
          text: `⚠ ${p.name} (${rm.label}): mancano ${fields.join(", ")} — completa prima della scadenza.`,
        });
      }
    } else {
      // ASSISTITO: formato/portale non integrato → l'host inserisce i numeri a mano.
      res.assistito += 1;
      bucket.lines.push({
        kind: "assistito",
        text: `• ${p.name} (${rm.label}): portale ${rm.system} non integrato — inserisci i numeri dal report sul portale regionale.`,
      });
    }

    byOrg.set(p.organizationId, bucket);
  }

  // Una email per org con almeno una struttura rilevante.
  for (const [, bucket] of byOrg) {
    if (bucket.lines.length === 0) continue;
    if (!bucket.email) {
      res.skippedNoEmail += 1;
      continue;
    }
    const deadlineStr = deadline.toISOString().slice(0, 10);
    const body =
      `Movimento turistico — ${label}\n\n` +
      `Scadenza di trasmissione: ${deadlineStr}.\n\n` +
      bucket.lines.map((l) => l.text).join("\n") +
      `\n\nNorma prepara il file/i numeri; il caricamento sul portale resta a te (non inviamo noi).`;
    // Isolamento per-email: un invio fallito non deve impedire i reminder alle altre org.
    try {
      await deps.email.send({
        to: bucket.email,
        subject: `Movimento turistico ${label}: cosa fare entro il ${deadlineStr}`,
        text: body,
      });
      res.orgsNotified += 1;
    } catch {
      res.emailFailed += 1;
    }
  }

  return res;
}

// Composizione PURA del digest settimanale "Fatto da Norma" (email del lunedì mattina).
// Nessun I/O: prende i CONTEGGI reali della settimana e ritorna subject + testo pronti per
// l'EmailSender. Tono Norma: sobrio, concreto, niente hype. Solo dati esistenti, niente promesse.
//
// Tre blocchi, come da spec:
//   1. cosa ha fatto Norma nella settimana (conteggi reali);
//   2. cosa serve questa settimana (pendenze e prossimi arrivi);
//   3. posizione regolare sì/no (nessuna schedina scaduta non acquisita, nessuna da rivedere).

/** Cosa ha fatto Norma nella settimana trascorsa (conteggi reali, già calcolati a monte). */
export interface DigestDone {
  /** Schedine acquisite dalla Questura nella settimana. */
  schedineAcquired: number;
  /** Check-in ospite completati nella settimana. */
  checkinsCompleted: number;
  /** Soggiorni nuovi (importati da iCal o creati) nella settimana. */
  staysAdded: number;
  /** Dichiarazioni di tassa di soggiorno inviate nella settimana. */
  taxDeclared: number;
}

/** Cosa serve questa settimana (stato attuale, non legato alla finestra trascorsa). */
export interface DigestUpcoming {
  /** Schedine in attesa di invio o da rivedere (PENDING / NEEDS_REVIEW). */
  schedinePending: number;
  /** Arrivi previsti nei prossimi 7 giorni. */
  arrivalsNext7Days: number;
  /** Check-in ancora da completare per arrivi imminenti. */
  checkinsAwaiting: number;
}

/** Elementi che rompono la "posizione regolare" adesso. */
export interface DigestPosition {
  /** Schedine oltre la deadline e non ancora acquisite. */
  overdue: number;
  /** Schedine che richiedono intervento umano (tentativi esauriti). */
  needsReview: number;
}

export interface WeeklyDigestData {
  orgName: string;
  /** Inizio finestra settimanale, ISO "YYYY-MM-DD" (incluso). */
  weekStartIso: string;
  /** Fine finestra settimanale, ISO "YYYY-MM-DD" (incluso). */
  weekEndIso: string;
  done: DigestDone;
  upcoming: DigestUpcoming;
  position: DigestPosition;
}

export interface ComposedDigest {
  subject: string;
  text: string;
}

const FOOTER =
  "— Norma\nCompliance per affitti brevi · norma.casa\n" +
  "Ricevi questo riepilogo ogni lunedì. Lo storico completo è in app, alla voce «Storico».";

/** La posizione è regolare se non ci sono schedine scadute né schedine da rivedere. */
export function isRegularPosition(position: DigestPosition): boolean {
  return position.overdue === 0 && position.needsReview === 0;
}

/** "12 giugno" da una stringa ISO "YYYY-MM-DD" (pura, senza dipendere dal fuso). */
function humanDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  const day = Number(m[3]);
  const month = months[Number(m[2]) - 1] ?? m[2];
  return `${day} ${month}`;
}

/** Riga "• N cosa" solo se N > 0; altrimenti null (così le sezioni vuote spariscono). */
function line(count: number, singular: string, plural: string): string | null {
  if (count <= 0) return null;
  return `• ${count} ${count === 1 ? singular : plural}`;
}

/**
 * Compone subject + testo del digest settimanale. Funzione pura: stesso input → stesso output.
 * Le sezioni senza numeri scompaiono, così l'host non riceve liste di zeri.
 */
export function composeWeeklyDigestEmail(data: WeeklyDigestData): ComposedDigest {
  const regular = isRegularPosition(data.position);
  const period = `${humanDay(data.weekStartIso)} – ${humanDay(data.weekEndIso)}`;

  const subject = regular
    ? `Norma · la tua settimana (${humanDay(data.weekEndIso)}) — tutto in regola`
    : `Norma · la tua settimana (${humanDay(data.weekEndIso)}) — qualcosa da sistemare`;

  const doneLines = [
    line(
      data.done.schedineAcquired,
      "schedina acquisita dalla Questura",
      "schedine acquisite dalla Questura",
    ),
    line(
      data.done.checkinsCompleted,
      "check-in completato dagli ospiti",
      "check-in completati dagli ospiti",
    ),
    line(data.done.staysAdded, "nuovo soggiorno", "nuovi soggiorni"),
    line(
      data.done.taxDeclared,
      "dichiarazione tassa di soggiorno inviata",
      "dichiarazioni tassa di soggiorno inviate",
    ),
  ].filter((l): l is string => l !== null);

  const upcomingLines = [
    line(data.upcoming.schedinePending, "schedina da inviare", "schedine da inviare"),
    line(
      data.upcoming.arrivalsNext7Days,
      "arrivo nei prossimi 7 giorni",
      "arrivi nei prossimi 7 giorni",
    ),
    line(
      data.upcoming.checkinsAwaiting,
      "check-in ancora da completare",
      "check-in ancora da completare",
    ),
  ].filter((l): l is string => l !== null);

  const parts: string[] = [];
  parts.push(`Ciao,`);
  parts.push(`ecco cosa è successo per ${data.orgName} dal ${period}.`);

  parts.push(
    doneLines.length > 0
      ? `Fatto da Norma questa settimana:\n${doneLines.join("\n")}`
      : `Questa settimana Norma non ha registrato attività: nessun nuovo soggiorno o invio.`,
  );

  if (upcomingLines.length > 0) {
    parts.push(`Cosa serve adesso:\n${upcomingLines.join("\n")}`);
  } else {
    parts.push(`Cosa serve adesso: niente in sospeso. Sei a posto.`);
  }

  parts.push(
    regular
      ? `Posizione: REGOLARE. Tutte le schedine dovute risultano acquisite.`
      : positionWarning(data.position),
  );

  parts.push(FOOTER);

  return { subject, text: parts.join("\n\n") };
}

function positionWarning(position: DigestPosition): string {
  const bits: string[] = [];
  if (position.overdue > 0) {
    bits.push(
      `${position.overdue} ${position.overdue === 1 ? "schedina è oltre la scadenza" : "schedine sono oltre la scadenza"} e non ancora acquisita`,
    );
  }
  if (position.needsReview > 0) {
    bits.push(
      `${position.needsReview} ${position.needsReview === 1 ? "schedina richiede" : "schedine richiedono"} una tua verifica`,
    );
  }
  return `Posizione: DA SISTEMARE. ${bits.join("; ")}. Apri Norma per chiudere le pendenze.`;
}

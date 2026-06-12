// Tipi condivisi tra le server action iCal e il wizard client.
// Stanno fuori da `actions.ts` perché un file "use server" può esportare solo funzioni async.

/** Una prenotazione in anteprima, con le date già formattate lato server (Europe/Rome). */
export type PreviewItem = {
  uid: string;
  arrival: string;
  departure: string | null;
  nights: number | null;
  summary: string | null;
};

/** Esito dell'anteprima di un feed iCal (prima dell'import). */
export type PreviewResponse =
  | { ok: true; sourceLabel: string; total: number; blocked: number; items: PreviewItem[] }
  | { ok: false; message: string };

/** Esito della conferma (collega + sincronizza). */
export type ImportResponse = { ok: boolean; message: string };

import type { SchedinaRepository } from "../../alloggiati";
import {
  buildSchedinaIntents,
  computeSendWindow,
  isArrivalWithinSendWindow,
} from "../domain/generation";
import type { Party } from "../domain/parties";
import type { CreateStayInput, ReferenceTablesLoader, StaysRepository } from "../ports";

export class StaysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaysError";
  }
}

export interface GenerateResult {
  created: number;
  existing: number;
  schedinaIds: string[];
}

/**
 * Servizio soggiorni/ospiti. Orchestrazione di alto livello: crea il soggiorno, aggiunge gli
 * ospiti (gestendo capo→membri), e genera gli intenti schedina nell'outbox.
 * Non invia nulla ad Alloggiati: si ferma a "schedine PENDING pronte".
 */
export class StaysService {
  private readonly now: () => Date;

  constructor(
    private readonly stays: StaysRepository,
    private readonly schedine: SchedinaRepository,
    private readonly referenceLoader: ReferenceTablesLoader,
    options: { now?: () => Date } = {},
  ) {
    // Orologio iniettabile (test): serve per la finestra di invio "oggi/ieri".
    this.now = options.now ?? (() => new Date());
  }

  async createStay(input: CreateStayInput): Promise<{ id: string }> {
    if (input.guestsCount < 1) {
      throw new StaysError("Il soggiorno deve avere almeno un ospite (guestsCount ≥ 1).");
    }
    if (input.departureDate && input.departureDate.getTime() < input.arrivalDate.getTime()) {
      throw new StaysError("La data di partenza non può precedere quella di arrivo.");
    }
    return this.stays.createStay(input);
  }

  async addGuests(
    stayId: string,
    organizationId: string,
    parties: Party[],
  ): Promise<{ guestIds: string[] }> {
    if (parties.length === 0) {
      throw new StaysError("Nessun ospite da aggiungere.");
    }
    return this.stays.addGuests(stayId, organizationId, parties);
  }

  /**
   * Genera le schedine (stato PENDING) per un soggiorno.
   * - Valida TUTTI gli ospiti prima di persistere (dati mancanti → errore, niente schedine parziali).
   * - Idempotente: rieseguire non crea doppioni (anti-doppione del repository).
   */
  async generateSchedine(stayId: string): Promise<GenerateResult> {
    const data = await this.stays.loadForGeneration(stayId);
    if (!data) {
      throw new StaysError(`Soggiorno non trovato: ${stayId}.`);
    }
    if (!data.credentialId) {
      throw new StaysError(
        `L'immobile del soggiorno ${stayId} non è collegato a una credenziale Alloggiati: impossibile generare le schedine.`,
      );
    }

    // Finestra di invio (verificata in Fase D): l'arrivo dev'essere OGGI o IERI, altrimenti
    // Alloggiati rifiuta la schedina ("Data di Arrivo Errata"). Blocchiamo PRIMA di generare:
    // meglio un errore chiaro qui che una schedina PENDING destinata a un rifiuto certo.
    const now = this.now();
    if (!isArrivalWithinSendWindow(data.stay.arrivalDate, now)) {
      const w = computeSendWindow(now);
      throw new StaysError(
        `Soggiorno ${stayId}: data di arrivo fuori dalla finestra di invio di Alloggiati. ` +
          `Sono accettati solo arrivi di OGGI o IERI (${w.earliest} … ${w.latest}, fuso Italia); ` +
          `date più vecchie o nel futuro vengono rifiutate (cod. 12 "Data di Arrivo Errata"). ` +
          "Le schedine NON vengono generate, per non incorrere in un rifiuto certo.",
      );
    }

    const refs = await this.referenceLoader.loadForGuests(data.guests);

    // Validazione + costruzione di TUTTI gli intenti PRIMA di scrivere: se un ospite è incompleto
    // qui viene lanciata un'eccezione e non si crea alcuna schedina.
    const intents = buildSchedinaIntents(
      {
        organizationId: data.organizationId,
        credentialId: data.credentialId,
        alloggiatiApartmentId: data.alloggiatiApartmentId,
        stay: data.stay,
        guests: data.guests,
      },
      refs,
    );

    let created = 0;
    let existing = 0;
    const schedinaIds: string[] = [];
    for (const intent of intents) {
      const res = await this.schedine.createIntent(intent);
      schedinaIds.push(res.schedina.id);
      if (res.created) created += 1;
      else existing += 1;
    }
    return { created, existing, schedinaIds };
  }
}

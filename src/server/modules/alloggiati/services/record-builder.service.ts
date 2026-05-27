import type { PrismaClient } from "@prisma/client";
import { buildRecordFromEntities } from "../domain/resolver";
import type { ReferenceTablesLoader } from "../ports/ReferenceTablesLoader";

export class RecordBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordBuilderError";
  }
}

/**
 * RecordBuilder REALE: dato l'id di una schedina, carica dal DB l'ospite, il soggiorno e
 * l'immobile, risolve i codici delle tabelle di riferimento e produce la riga del tracciato
 * (168, o 174 "file unico" se l'immobile ha un IdAppartamento Alloggiati).
 *
 * È la sostituzione del segnaposto `buildRecord` dell'outbox: `(id) => recordBuilder.build(id)`.
 * Se le tabelle di riferimento sono vuote (mai sincronizzate), il resolver lancia un errore
 * chiaro — vedi reference-health: il prodotto non può generare schedine reali finché non si
 * popolano le tabelle dal servizio.
 */
export class SchedinaRecordBuilder {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly referenceLoader: ReferenceTablesLoader,
  ) {}

  async build(schedinaId: string): Promise<string> {
    const sched = await this.prisma.schedina.findUnique({
      where: { id: schedinaId },
      select: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            sex: true,
            birthDate: true,
            birthCountryId: true,
            birthComuneId: true,
            citizenshipId: true,
            documentTypeId: true,
            documentNumber: true,
            documentPlaceId: true,
            tipoAlloggiato: true,
            stay: {
              select: {
                arrivalDate: true,
                departureDate: true,
                property: { select: { alloggiatiApartmentId: true } },
              },
            },
          },
        },
      },
    });
    if (!sched) {
      throw new RecordBuilderError(`Schedina non trovata: ${schedinaId}.`);
    }

    const guest = sched.guest;
    const { stay } = guest;
    const refs = await this.referenceLoader.loadForGuests([guest]);
    const idAppartamento = parseApartmentId(stay.property.alloggiatiApartmentId);

    return buildRecordFromEntities(
      guest,
      { arrivalDate: stay.arrivalDate, departureDate: stay.departureDate },
      refs,
      idAppartamento === undefined ? {} : { idAppartamento },
    );
  }
}

/** `alloggiatiApartmentId` è una stringa nullable: per il "file unico" serve un intero. */
function parseApartmentId(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new RecordBuilderError(`IdAppartamento non valido (atteso intero ≥ 0): "${raw}".`);
  }
  return n;
}

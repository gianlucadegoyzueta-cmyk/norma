// Loader del payload Sicilia (WebAPI PMS) dai dati reali (Prisma): soggiorni Norma → SiciliaStay[].
// DOMINIO puro nel serializer; qui solo query → risoluzione codici → DTO. PrismaClient iniettato; multi-tenant.
//
// DISCIPLINA "mai inventare": i campi obbligatori non disponibili (codici, data di partenza) → `missing`,
// e l'esito resta INCOMPLETE. La trasmissione vera è gated altrove (transmit.ts): qui si prepara soltanto.
//
// hotelCode NON è nello schema (è parte della registrazione del cliente sul portale): passato come input
// (verrà dal vault credenziali per-struttura quando la migrazione sarà applicata).

import type { PrismaClient, Sex, TipoAlloggiato } from "@prisma/client";
import { periodBounds } from "../ross1000/period";
import type { SiciliaEndDay, SiciliaGuest, SiciliaStay } from "./tracciato-xml";

const ITALIA_CODE = "100000100";

const TYPE_BY_TIPO: Record<TipoAlloggiato, number> = {
  OSPITE_SINGOLO: 16,
  CAPO_FAMIGLIA: 17,
  CAPO_GRUPPO: 18,
  FAMILIARE: 19,
  MEMBRO_GRUPPO: 20,
};

const GENDER_BY_SEX: Record<Sex, 1 | 2> = { M: 1, F: 2 };

export interface SiciliaMissingDatum {
  field: string;
  scope: "STRUTTURA" | "GUEST";
  refId?: string;
}

export interface BuildSiciliaInput {
  organizationId: string;
  propertyId: string;
  period: string; // "YYYY-MM"
  hotelCode: string; // codice struttura Sicilia (TRS-IT-SIC-xxxxx), dalla config/vault del cliente
}

export type SiciliaReportOutcome =
  | { kind: "OK"; stays: SiciliaStay[]; guests: number }
  | { kind: "INCOMPLETE"; missing: SiciliaMissingDatum[] };

function utc(d: Date): string {
  return d.toISOString(); // sempre "YYYY-MM-DDThh:mm:ss.sssZ"
}

function ageAt(birth: Date, arrival: Date): number {
  let age = arrival.getUTCFullYear() - birth.getUTCFullYear();
  const before =
    arrival.getUTCMonth() < birth.getUTCMonth() ||
    (arrival.getUTCMonth() === birth.getUTCMonth() && arrival.getUTCDate() < birth.getUTCDate());
  if (before) age -= 1;
  return age;
}

/** Costruisce i soggiorni PMS per le strutture con ARRIVO nel periodo. Dati mancanti → INCOMPLETE. */
export async function loadSiciliaReport(
  prisma: PrismaClient,
  input: BuildSiciliaInput,
): Promise<SiciliaReportOutcome> {
  const missing: SiciliaMissingDatum[] = [];
  if (!input.hotelCode || input.hotelCode.trim() === "") {
    missing.push({ field: "hotelCode", scope: "STRUTTURA" });
  }

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!property) {
    return { kind: "INCOMPLETE", missing: [{ field: "struttura", scope: "STRUTTURA" }] };
  }

  const { start, end } = periodBounds(input.period);
  const rows = await prisma.stay.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      arrivalDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      arrivalDate: true,
      departureDate: true,
      guests: {
        select: {
          id: true,
          sex: true,
          birthDate: true,
          tipoAlloggiato: true,
          citizenship: { select: { code: true } },
          birthCountry: { select: { code: true } },
          birthComune: { select: { code: true } },
          residenceCountry: { select: { code: true } },
          residenceComune: { select: { code: true } },
        },
      },
    },
  });

  let guestCount = 0;
  const stays: SiciliaStay[] = rows.map((s): SiciliaStay => {
    const arrivalIso = utc(s.arrivalDate);
    // DepartureDate è obbligatoria per il PMS: se il soggiorno è ancora aperto, segnaliamo (mai inventata).
    const departureIso = s.departureDate ? utc(s.departureDate) : null;
    if (!departureIso) {
      missing.push({ field: "departureDate", scope: "STRUTTURA", refId: s.id });
    }

    const guests: SiciliaGuest[] = s.guests.map((g): SiciliaGuest => {
      guestCount += 1;
      const need = (val: string | null | undefined, field: string): string => {
        if (val === null || val === undefined || val === "") {
          missing.push({ field, scope: "GUEST", refId: g.id });
          return "";
        }
        return val;
      };
      const isBirthIt = g.birthCountry?.code === ITALIA_CODE;
      const isResIt = g.residenceCountry?.code === ITALIA_CODE;
      return {
        guestId: g.id,
        age: ageAt(g.birthDate, s.arrivalDate),
        nationalityCode: need(g.citizenship?.code, "NationalityCode"),
        birthPlaceCode: need(
          isBirthIt ? g.birthComune?.code : g.birthCountry?.code,
          "BirthPlaceCode",
        ),
        residencePlaceCode: need(
          isResIt ? g.residenceComune?.code : g.residenceCountry?.code,
          "ResidencePlaceCode",
        ),
        type: TYPE_BY_TIPO[g.tipoAlloggiato],
        gender: GENDER_BY_SEX[g.sex],
        // BedOccupancy non è raccolto da Norma: default "occupa" (assunzione documentata).
        bedOccupancy: true,
        arrivalDate: arrivalIso,
        departureDate: departureIso ?? arrivalIso,
        // Checkout = ha già lasciato la struttura (data di partenza presente).
        checkout: departureIso != null,
        rooms: [{ roomId: "1", startDate: arrivalIso, endDate: departureIso ?? arrivalIso }],
      };
    });

    return { hotelCode: input.hotelCode, stayId: s.id, guests };
  });

  if (missing.length > 0) {
    return { kind: "INCOMPLETE", missing };
  }
  return { kind: "OK", stays, guests: guestCount };
}

/** Helper: chiusura giornaliera per una data (UTC). */
export function siciliaEndDay(hotelCode: string, day: Date): SiciliaEndDay {
  return { hotelCode, currentDate: utc(day) };
}

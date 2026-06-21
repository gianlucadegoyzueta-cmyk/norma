// Loader del report SPOT (movimento turistico Puglia) dai dati reali (Prisma).
// Tiene il DOMINIO puro (aggregate/tracciato-xml) e qui fa solo: query → risoluzione codici →
// aggregazione → serializzazione XML. PrismaClient iniettato (testabilità). Filtro multi-tenant.
//
// DISCIPLINA "mai inventare": i campi obbligatori del tracciato non disponibili NON vengono inventati
// → finiscono in `missing` e il report resta INCOMPLETE. La residenza usa il Comune (residenceComune)
// per l'Italia e il Paese estero (residenceCountry) per l'estero (SPOT usa il codice Paese, non NUTS).
//
// LIMITE NOTO (startup): la PRIMA trasmissione assoluta di una struttura su SPOT richiede l'elenco
// degli ospiti già presenti la notte precedente l'inizio interazione (regola 3). Questo loader genera
// il movimento ordinario del mese; il roster di startup è un adempimento una-tantum da gestire a parte.

import type { PrismaClient } from "@prisma/client";
import { periodBounds } from "../ross1000/period";
import { computeSpotMovimenti, type SpotAggregateStay, type SpotGuest } from "./aggregate";
import { ITALIA_CODE, buildSpotXml, type SpotResidenza } from "./tracciato-xml";

/** Nome del gestionale, scritto nell'attributo vendor del file SPOT. */
const VENDOR = "NORMA";

export interface SpotMissingDatum {
  field: string;
  scope: "STRUTTURA" | "GUEST";
  refId?: string; // guestId se scope=GUEST
}

export interface BuildSpotInput {
  organizationId: string;
  propertyId: string;
  period: string; // "YYYY-MM"
}

export type SpotOutcome =
  | { kind: "OK"; xml: string; arrivi: number; partenze: number; presenze: number }
  | { kind: "INCOMPLETE"; missing: SpotMissingDatum[] };

const LEAD_AL_SEGUITO = new Set(["FAMILIARE", "MEMBRO_GRUPPO"]);

/** Età (anni compiuti) alla data di arrivo. */
function ageAt(birth: Date, arrival: Date): number {
  let age = arrival.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    arrival.getUTCMonth() < birth.getUTCMonth() ||
    (arrival.getUTCMonth() === birth.getUTCMonth() && arrival.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Carica struttura + soggiorni + ospiti del periodo, costruisce il file XML SPOT.
 * Se mancano dati obbligatori → INCOMPLETE con l'elenco (mai inventati).
 */
export async function loadSpotReport(
  prisma: PrismaClient,
  input: BuildSpotInput,
): Promise<SpotOutcome> {
  const missing: SpotMissingDatum[] = [];

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId: input.organizationId },
    select: { camereDisponibili: true, lettiDisponibili: true },
  });
  if (!property) {
    return { kind: "INCOMPLETE", missing: [{ field: "struttura", scope: "STRUTTURA" }] };
  }
  if (property.camereDisponibili === null)
    missing.push({ field: "cameredisponibili", scope: "STRUTTURA" });
  if (property.lettiDisponibili === null)
    missing.push({ field: "postilettodisponibili", scope: "STRUTTURA" });

  const { start, end } = periodBounds(input.period);

  // Soggiorni che SI SOVRAPPONGONO al periodo (incl. quelli iniziati prima e ancora in corso o
  // a cavallo dell'intero mese): l'aggregato calcola l'occupazione notte-per-notte e ha bisogno di
  // tutti i soggiorni attivi nel periodo, non solo di quelli che vi arrivano/partono. Gli arrivi/
  // partenze restano comunque conteggiati solo se cadono nel periodo (vedi computeSpotMovimenti).
  const stays = await prisma.stay.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      arrivalDate: { lt: end },
      OR: [{ departureDate: { gte: start } }, { departureDate: null }],
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
          leaderId: true,
          citizenship: { select: { code: true } },
          residenceCountry: { select: { code: true } },
          residenceComune: { select: { code: true } },
        },
      },
    },
  });

  const aggregateStays: SpotAggregateStay[] = stays.map((s) => ({
    stayId: s.id,
    arrivalDate: s.arrivalDate,
    departureDate: s.departureDate,
    guests: s.guests.map((g): SpotGuest => {
      const need = (val: string | null | undefined, field: string): string => {
        if (val === null || val === undefined || val === "") {
          missing.push({ field, scope: "GUEST", refId: g.id });
          return "";
        }
        return val;
      };

      // Residenza: Italia → comune; estero → codice Paese (SPOT usa il codice Paese, non NUTS).
      const isItaly = g.residenceCountry?.code === ITALIA_CODE;
      const residenza: SpotResidenza = isItaly
        ? { comuneResidenzaCode: need(g.residenceComune?.code, "comuneresidenza") }
        : { paeseResidenzaCode: need(g.residenceCountry?.code, "paeseresidenza") };

      // idcapo (leaderCodice) obbligatorio per i membri 19/20.
      const alSeguito = LEAD_AL_SEGUITO.has(g.tipoAlloggiato);
      const leaderCodice = alSeguito ? need(g.leaderId, "leaderId") : undefined;

      return {
        codiceClienteSr: g.id,
        tipoAlloggiato: g.tipoAlloggiato,
        leaderCodice: leaderCodice || undefined,
        sesso: g.sex,
        cittadinanzaCode: need(g.citizenship?.code, "cittadinanza"),
        residenza,
        // occupazionepostoletto non è un dato raccolto da Norma: default "occupa" (assunzione documentata).
        occupaPostoLetto: true,
        eta: ageAt(g.birthDate, s.arrivalDate),
      };
    }),
  }));

  if (missing.length > 0) {
    return { kind: "INCOMPLETE", missing };
  }

  const agg = computeSpotMovimenti({
    period: input.period,
    capacity: {
      camereDisponibili: property.camereDisponibili!,
      lettiDisponibili: property.lettiDisponibili!,
    },
    stays: aggregateStays,
  });
  const xml = buildSpotXml({ vendor: VENDOR, giorni: agg.giorni });

  return {
    kind: "OK",
    xml,
    arrivi: agg.arriviTotali,
    partenze: agg.partenzeTotali,
    presenze: agg.presenze,
  };
}

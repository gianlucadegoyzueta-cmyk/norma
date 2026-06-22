// Loader del report Ross1000 (movimento turistico) a partire dai dati reali (Prisma).
// Tiene il DOMINIO puro (aggregate/tracciato-xml) e qui fa solo: query → risoluzione codici →
// aggregazione → serializzazione XML. Il PrismaClient è iniettato (testabilità).
//
// DISCIPLINA "mai inventare": i campi obbligatori del tracciato non disponibili NON vengono
// inventati — finiscono in `missing` e il report resta INCOMPLETE. La RESIDENZA usa il Comune
// (residenceComune) per l'Italia e `residenceForeignLocality` per l'estero; se il campo del caso
// è assente, `luogoresidenza` è segnalato mancante, non riempito a caso.
//
// Isolamento multi-tenant: ogni query filtra per organizationId.

import type { PrismaClient } from "@prisma/client";
import { computeMovimenti, type AggregateStay } from "./aggregate";
import { periodBounds } from "./period";
import { buildMovimentiXml, ITALIA_CODE, type ArrivoInput } from "./tracciato-xml";

/** Nome del gestionale, scritto nel campo <prodotto> del file Ross1000. */
const PRODOTTO = "NORMA";

/** Un campo obbligatorio non disponibile, con riferimento all'entità a cui manca. */
export interface MissingDatum {
  field: string;
  scope: "STRUTTURA" | "GUEST";
  refId?: string; // guestId se scope=GUEST
}

export interface BuildRoss1000Input {
  organizationId: string;
  propertyId: string;
  period: string; // "YYYY-MM"
}

export type Ross1000Outcome =
  | {
      kind: "OK";
      xml: string;
      codice: string;
      arrivi: number;
      partenze: number;
      presenze: number;
    }
  | { kind: "INCOMPLETE"; missing: MissingDatum[] };

/** idswh ≤ 20 char, stabile: ultimi 20 caratteri del cuid (alta entropia in coda). */
function shortIdswh(id: string): string {
  return id.length <= 20 ? id : id.slice(-20);
}

function isoDate(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

const TIPI_AL_SEGUITO = new Set(["FAMILIARE", "MEMBRO_GRUPPO"]);

/**
 * Carica struttura + soggiorni + ospiti del periodo, costruisce il file XML Ross1000.
 * Se mancano dati obbligatori → INCOMPLETE con l'elenco (mai inventati).
 */
export async function loadRoss1000Report(
  prisma: PrismaClient,
  input: BuildRoss1000Input,
): Promise<Ross1000Outcome> {
  const { start, end } = periodBounds(input.period);
  const missing: MissingDatum[] = [];

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId: input.organizationId },
    select: { ross1000Code: true, camereDisponibili: true, lettiDisponibili: true },
  });
  if (!property) {
    // Struttura inesistente per quest'org (anche cross-tenant): nessun dato.
    return { kind: "INCOMPLETE", missing: [{ field: "struttura", scope: "STRUTTURA" }] };
  }

  if (property.camereDisponibili === null)
    missing.push({ field: "cameredisponibili", scope: "STRUTTURA" });
  if (property.lettiDisponibili === null)
    missing.push({ field: "lettidisponibili", scope: "STRUTTURA" });
  if (!property.ross1000Code) missing.push({ field: "codice", scope: "STRUTTURA" });

  // Soggiorni che SI SOVRAPPONGONO al periodo (incl. quelli a cavallo dell'intero mese o ancora
  // aperti, iniziati prima): l'aggregato calcola l'occupazione notte-per-notte e li richiede tutti.
  // Gli arrivi/partenze restano conteggiati solo se cadono nel periodo (vedi computeMovimenti).
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
          firstName: true,
          lastName: true,
          sex: true,
          birthDate: true,
          tipoAlloggiato: true,
          leaderId: true,
          tourismType: true,
          transportMeans: true,
          citizenship: { select: { code: true } },
          residenceCountry: { select: { code: true } },
          residenceComune: { select: { code: true } },
          residenceForeignLocality: true,
          birthCountry: { select: { code: true } },
          birthComune: { select: { code: true } },
        },
      },
    },
  });

  const aggregateStays: AggregateStay[] = stays.map((s) => ({
    stayId: s.id,
    arrivalDate: s.arrivalDate,
    departureDate: s.departureDate,
    guests: s.guests.map((g): ArrivoInput => {
      const need = (val: string | null | undefined, field: string): string => {
        if (val === null || val === undefined || val === "") {
          missing.push({ field, scope: "GUEST", refId: g.id });
          return "";
        }
        return val;
      };

      const alSeguito = TIPI_AL_SEGUITO.has(g.tipoAlloggiato);
      const idCapo = alSeguito
        ? need(g.leaderId ? shortIdswh(g.leaderId) : undefined, "idcapo")
        : undefined;

      // luogoresidenza: Italia → codice Comune di residenza; estero → residenceForeignLocality
      // (NUTS/stringa). Se la sorgente del caso manca → missing (mai inventato).
      const isItalyResidence = g.residenceCountry?.code === ITALIA_CODE;
      const luogoResidenza = need(
        isItalyResidence ? g.residenceComune?.code : g.residenceForeignLocality,
        "luogoresidenza",
      );

      // comunenascita solo se nascita in Italia (regola del tracciato), altrimenti omesso.
      const nascitaItalia = g.birthCountry?.code === ITALIA_CODE;

      return {
        idswh: shortIdswh(g.id),
        tipoAlloggiato: g.tipoAlloggiato,
        idCapo: idCapo || undefined,
        cognome: g.lastName,
        nome: g.firstName,
        sesso: g.sex,
        cittadinanzaCode: need(g.citizenship?.code, "cittadinanza"),
        statoResidenzaCode: need(g.residenceCountry?.code, "statoresidenza"),
        luogoResidenza,
        dataNascita: isoDate(g.birthDate),
        statoNascitaCode: g.birthCountry?.code,
        comuneNascitaCode: nascitaItalia ? (g.birthComune?.code ?? undefined) : undefined,
        tipoTurismo: need(g.tourismType, "tipoturismo"),
        mezzoTrasporto: need(g.transportMeans, "mezzotrasporto"),
      };
    }),
  }));

  if (missing.length > 0) {
    return { kind: "INCOMPLETE", missing };
  }

  const agg = computeMovimenti({
    period: input.period,
    capacity: {
      camereDisponibili: property.camereDisponibili!,
      lettiDisponibili: property.lettiDisponibili!,
    },
    stays: aggregateStays,
  });
  const xml = buildMovimentiXml({
    codice: property.ross1000Code!,
    prodotto: PRODOTTO,
    giorni: agg.giorni,
  });

  return {
    kind: "OK",
    xml,
    codice: property.ross1000Code!,
    arrivi: agg.arriviTotali,
    partenze: agg.partenzeTotali,
    presenze: agg.presenze,
  };
}

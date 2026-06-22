// Loader del report Umbria (Turismatica C59) dai dati reali (Prisma). DOMINIO puro in aggregate/tracciato;
// qui: query → risoluzione provenienza → aggregazione → file giornalieri. PrismaClient iniettato; multi-tenant.
//
// DISCIPLINA "mai inventare": la provenienza (sigla provincia IT o codice estero Turismatica) si risolve
// dalle tabelle ufficiali; se un guest non è mappabile (comune senza provincia, paese estero non a tabella)
// finisce in `missing` e il report resta INCOMPLETE. Mai un codice provenienza arbitrario.
//
// Output: UN FILE PER GIORNO con attività/presenza (TOLM importa file giornalieri indipendenti).

import type { PrismaClient } from "@prisma/client";
import { periodBounds } from "../ross1000/period";
import { computeUmbriaC59, type UmbriaAggregateStay, type UmbriaGuest } from "./aggregate";
import { buildC59Giorno, filenameC59 } from "./tracciato";
import { provenienzaEstero, provenienzaItalia } from "./provenienze";

/** Codice Paese Italia (tabella Polizia): discrimina residenza per comune (IT) vs paese (estero). */
const ITALIA_CODE = "100000100";

export interface UmbriaMissingDatum {
  field: string;
  scope: "STRUTTURA" | "GUEST";
  refId?: string;
}

export interface BuildUmbriaInput {
  organizationId: string;
  propertyId: string;
  period: string; // "YYYY-MM"
}

export interface UmbriaFile {
  filename: string; // ggmmaaaa.txt
  content: string;
}

export type UmbriaOutcome =
  | { kind: "OK"; files: UmbriaFile[]; arrivi: number; partenze: number; presenze: number }
  | { kind: "INCOMPLETE"; missing: UmbriaMissingDatum[] };

export async function loadUmbriaReport(
  prisma: PrismaClient,
  input: BuildUmbriaInput,
): Promise<UmbriaOutcome> {
  const missing: UmbriaMissingDatum[] = [];

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId: input.organizationId },
    select: { name: true, camereDisponibili: true },
  });
  if (!property) {
    return { kind: "INCOMPLETE", missing: [{ field: "struttura", scope: "STRUTTURA" }] };
  }
  if (property.camereDisponibili === null) {
    missing.push({ field: "cameredisponibili", scope: "STRUTTURA" });
  }

  const { start, end } = periodBounds(input.period);

  // Soggiorni che SI SOVRAPPONGONO al periodo (incl. quelli iniziati prima e ancora in corso):
  // servono per "presenti notte precedente" e per l'occupazione dei giorni intermedi.
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
          residenceCountry: { select: { code: true, name: true } },
          residenceComune: { select: { provincia: true } },
        },
      },
    },
  });

  const aggregateStays: UmbriaAggregateStay[] = stays.map((s) => ({
    arrivalDate: s.arrivalDate,
    departureDate: s.departureDate,
    guests: s.guests.map((g): UmbriaGuest => {
      const isItaly = g.residenceCountry?.code === ITALIA_CODE;
      const prov = isItaly
        ? g.residenceComune?.provincia
          ? provenienzaItalia(g.residenceComune.provincia)
          : null
        : g.residenceCountry?.name
          ? provenienzaEstero(g.residenceCountry.name)
          : null;
      if (!prov) {
        missing.push({ field: "provenienza", scope: "GUEST", refId: g.id });
        return { provenienzaCode: "", provenienzaDescrizione: "" };
      }
      return { provenienzaCode: prov.code, provenienzaDescrizione: prov.descrizione };
    }),
  }));

  if (missing.length > 0) {
    return { kind: "INCOMPLETE", missing };
  }

  const agg = computeUmbriaC59({
    period: input.period,
    denominazione: property.name,
    capacity: { camereDisponibili: property.camereDisponibili! },
    stays: aggregateStays,
  });

  // Solo i giorni con presenza o movimento (no file a zero per i giorni interamente vuoti).
  const files: UmbriaFile[] = agg.files
    .filter(
      (f) =>
        f.presentiNottePrecedente > 0 || f.arrivati > 0 || f.partiti > 0 || f.camereOccupate > 0,
    )
    .map((f) => ({ filename: filenameC59(f.data), content: buildC59Giorno(f) }));

  return {
    kind: "OK",
    files,
    arrivi: agg.arriviTotali,
    partenze: agg.partenzeTotali,
    presenze: agg.presenze,
  };
}

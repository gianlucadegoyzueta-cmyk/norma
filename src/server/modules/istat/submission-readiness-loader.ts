// Loader della PRONTEZZA all'invio ISTAT per le strutture di un'organizzazione (lato server: Prisma).
// Tiene il DOMINIO puro (submission-readiness.ts) e qui fa solo: routing per provincia → prepara il
// tracciato col serializer giusto → risolve il canale (stub) → calcola la prontezza. Multi-tenant.
//
// GUARDRAIL #1: il canale è SEMPRE uno stub (resolveIstatSubmissionChannel) → canAutoSubmit è sempre
// false. Nessun invio reale parte da qui: la pipeline prepara e basta. L'isolamento per-struttura
// (try/catch) evita che una struttura con dati fuori vincolo del tracciato faccia esplodere la pagina.

import type { PrismaClient } from "@prisma/client";
import { resolveIstatSubmissionChannel } from "./adapters/submission/StubIstatSubmission";
import {
  computeSubmissionReadiness,
  type RegionalPreparation,
  type SubmissionReadiness,
} from "./domain/submission-readiness";
import { regionMovementForProvincia, type RegionSerializerId } from "./regional/routing";
import { loadRoss1000Report } from "./ross1000/report";
import { loadSpotReport } from "./spot/report";
import { loadUmbriaReport } from "./umbria/report";

export interface PropertyReadiness {
  propertyId: string;
  propertyName: string;
  readiness: SubmissionReadiness;
  /** True se la preparazione del tracciato ha lanciato (dati fuori vincolo): segnala "da verificare". */
  errored: boolean;
}

interface ReportIds {
  organizationId: string;
  propertyId: string;
}

/** Prepara il tracciato per il serializer della regione, normalizzando l'esito a OK/INCOMPLETE. */
async function prepareForSerializer(
  prisma: PrismaClient,
  serializerId: RegionSerializerId,
  ids: ReportIds,
  period: string,
): Promise<RegionalPreparation> {
  switch (serializerId) {
    case "ross1000-xml": {
      const out = await loadRoss1000Report(prisma, { ...ids, period });
      return out.kind === "OK" ? { kind: "OK" } : { kind: "INCOMPLETE", missing: out.missing };
    }
    case "spot-xml": {
      const out = await loadSpotReport(prisma, { ...ids, period });
      return out.kind === "OK" ? { kind: "OK" } : { kind: "INCOMPLETE", missing: out.missing };
    }
    case "turismatica-c59": {
      const out = await loadUmbriaReport(prisma, { ...ids, period });
      return out.kind === "OK" ? { kind: "OK" } : { kind: "INCOMPLETE", missing: out.missing };
    }
  }
}

export interface PropertyInput {
  id: string;
  name: string;
  provincia: string | null;
}

/**
 * Calcola la prontezza all'invio per ogni struttura passata. Le strutture sono passate dal chiamante
 * (la pagina le carica già con il routing per provincia), così questo loader resta focalizzato sul
 * preparare i tracciati e calcolare la prontezza.
 */
export async function loadIstatSubmissionReadiness(
  prisma: PrismaClient,
  organizationId: string,
  period: string,
  properties: readonly PropertyInput[],
): Promise<PropertyReadiness[]> {
  const out: PropertyReadiness[] = [];

  for (const p of properties) {
    const region = regionMovementForProvincia(p.provincia);
    const channel = region ? resolveIstatSubmissionChannel(region.serializerId) : null;
    const channelVerdict = channel ? { isImplemented: channel.isImplemented } : null;

    // Solo le regioni a FILE/AUTO con un serializer hanno un tracciato da preparare.
    let prep: RegionalPreparation | null = null;
    let errored = false;
    if (region && region.serializerId) {
      try {
        prep = await prepareForSerializer(
          prisma,
          region.serializerId,
          { organizationId, propertyId: p.id },
          period,
        );
      } catch {
        // Dati fuori vincolo del tracciato: isola la struttura, non abbattere la pagina.
        errored = true;
        prep = { kind: "INCOMPLETE", missing: [{ field: "struttura" }] };
      }
    }

    out.push({
      propertyId: p.id,
      propertyName: p.name,
      readiness: computeSubmissionReadiness(region, prep, channelVerdict),
      errored,
    });
  }

  return out;
}

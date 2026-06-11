"use server";

import { revalidatePath } from "next/cache";
import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createCheckinToken } from "@/server/modules/checkin/token";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import {
  ICalHttpFetcher,
  PrismaReservationImportRepository,
  ReservationImportService,
} from "@/server/modules/reservations";

/**
 * Azioni rapide della command palette (⌘K). Riusano i servizi di dominio esistenti — niente
 * logica nuova lato server, nessun cambio di schema. Tutte verificano la sessione e isolano per org.
 */

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Rome",
});

/**
 * Sincronizza TUTTI i feed iCal di tutti gli immobili dell'organizzazione corrente.
 * Aggrega gli esiti e non si interrompe sui singoli errori (li conteggia).
 */
export async function syncAllIcalAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, error: "Sessione scaduta: rifai il login." };
  const orgId = ctx.current.organizationId;

  const properties = await new PrismaPropertyRepository(prisma).listByOrganization(orgId);
  const service = new ReservationImportService(
    new PrismaReservationImportRepository(prisma),
    new ICalHttpFetcher(),
  );

  let created = 0;
  let updated = 0;
  let errors = 0;
  for (const p of properties) {
    const { results, errors: errs } = await service.syncProperty(p.id, orgId);
    created += results.created;
    updated += results.updated;
    errors += errs.length;
  }

  // Le pagine immobili mostrano i soggiorni importati: invalidale così riflettono il sync.
  revalidatePath("/properties", "layout");
  revalidatePath("/stays");

  if (created === 0 && updated === 0 && errors === 0) {
    return { ok: true, message: "Calendari già aggiornati: nessuna novità." };
  }
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} ${created === 1 ? "nuovo" : "nuovi"}`);
  if (updated > 0) parts.push(`${updated} aggiornati`);
  if (errors > 0) parts.push(`${errors} ${errors === 1 ? "feed in errore" : "feed in errore"}`);
  return { ok: true, message: `Sincronizzato: ${parts.join(", ")}.` };
}

/**
 * Trova l'arrivo imminente (primo soggiorno con arrivo da oggi in poi), genera un link
 * pubblico di check-in e lo ritorna pronto da copiare, con un'etichetta leggibile.
 */
export async function imminentCheckinLinkAction(): Promise<
  { ok: true; url: string; label: string } | { ok: false; error: string }
> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, error: "Sessione scaduta: rifai il login." };
  const orgId = ctx.current.organizationId;

  // Inizio di oggi (mezzanotte locale): include gli arrivi di oggi.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stay = await prisma.stay.findFirst({
    where: { organizationId: orgId, arrivalDate: { gte: today } },
    orderBy: { arrivalDate: "asc" },
    select: { id: true, arrivalDate: true, property: { select: { name: true } } },
  });
  if (!stay) return { ok: false, error: "Nessun arrivo imminente da preparare." };

  const token = await createCheckinToken(stay.id, orgId);
  return {
    ok: true,
    url: `${appBaseUrl()}/checkin/${token}`,
    label: `${stay.property.name} · ${dateFmt.format(stay.arrivalDate)}`,
  };
}

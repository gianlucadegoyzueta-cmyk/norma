"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import {
  ICalHttpFetcher,
  PrismaReservationImportRepository,
  ReservationImportService,
  ReservationsError,
} from "@/server/modules/reservations";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

function makeService(): ReservationImportService {
  return new ReservationImportService(
    new PrismaReservationImportRepository(prisma),
    new ICalHttpFetcher(),
  );
}

/** Verifica che l'immobile sia dell'organizzazione corrente; ritorna orgId o null. */
async function assertOwnProperty(propertyId: string): Promise<string | null> {
  const ctx = await getCurrentContext();
  if (!ctx) return null;
  const orgId = ctx.current.organizationId;
  const owned = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: orgId },
    select: { id: true },
  });
  return owned ? orgId : null;
}

/** Collega un nuovo URL iCal all'immobile. */
export async function addImportAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return { ok: false, message: "Immobile non trovato o sessione scaduta." };

  try {
    await makeService().addImport(orgId, propertyId, url);
  } catch (err) {
    if (err instanceof ReservationsError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nel collegare il calendario. Riprova." };
  }

  revalidatePath(`/properties/${propertyId}`);
  return { ok: true, message: "Calendario collegato ✓ Premi «Sincronizza» per importare." };
}

/** Sincronizza un feed iCal: importa/aggiorna i soggiorni bozza. */
export async function syncImportAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const importId = String(formData.get("importId") ?? "").trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return { ok: false, message: "Immobile non trovato o sessione scaduta." };

  try {
    const r = await makeService().syncImport(importId, orgId);
    revalidatePath(`/properties/${propertyId}`);
    const parts = [`${r.seen} prenotazioni nel calendario`];
    if (r.created) parts.push(`${r.created} nuove`);
    if (r.updated) parts.push(`${r.updated} aggiornate`);
    if (r.cancelled) parts.push(`${r.cancelled} annullate`);
    if (r.flaggedForReview) parts.push(`${r.flaggedForReview} da verificare`);
    return { ok: true, message: `Sincronizzato ✓ ${parts.join(" · ")}` };
  } catch (err) {
    revalidatePath(`/properties/${propertyId}`);
    if (err instanceof ReservationsError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore di sincronizzazione. Riprova." };
  }
}

/** Rimuove il collegamento a un feed iCal (i soggiorni già importati restano). */
export async function removeImportAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const importId = String(formData.get("importId") ?? "").trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return;

  await makeService().removeImport(importId, orgId);
  revalidatePath(`/properties/${propertyId}`);
}

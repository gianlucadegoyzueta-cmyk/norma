"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import {
  ICalHttpFetcher,
  PrismaReservationImportRepository,
  ReservationImportService,
  ReservationsError,
  sourceLabel,
} from "@/server/modules/reservations";
import type { ImportResponse, PreviewResponse } from "./ical-types";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

// Date dell'anteprima formattate qui (server) per coerenza col resto della pagina.
const previewDateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

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

/**
 * ANTEPRIMA: legge il feed iCal e mostra le prenotazioni trovate PRIMA di importare.
 * Nessuna scrittura a DB. Le date sono formattate qui (Europe/Rome) per la UI.
 */
export async function previewImportAction(input: {
  propertyId: string;
  url: string;
}): Promise<PreviewResponse> {
  const propertyId = input.propertyId.trim();
  const url = input.url.trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return { ok: false, message: "Immobile non trovato o sessione scaduta." };

  try {
    const preview = await makeService().previewImport(url);
    return {
      ok: true,
      sourceLabel: sourceLabel(preview.source),
      total: preview.total,
      blocked: preview.blocked,
      items: preview.reservations.map((r) => ({
        uid: r.uid,
        arrival: previewDateFmt.format(r.arrivalDate),
        departure: r.departureDate ? previewDateFmt.format(r.departureDate) : null,
        nights: r.nights,
        summary: r.summary,
      })),
    };
  } catch (err) {
    if (err instanceof ReservationsError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nel leggere il calendario. Riprova." };
  }
}

/** CONFERMA: collega il feed e lo sincronizza subito; ritorna il riepilogo dell'import. */
export async function confirmImportAction(input: {
  propertyId: string;
  url: string;
}): Promise<ImportResponse> {
  const propertyId = input.propertyId.trim();
  const url = input.url.trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return { ok: false, message: "Immobile non trovato o sessione scaduta." };
  const access = await checkWriteAccess(orgId);
  if (!access.ok) return { ok: false, message: access.message };

  try {
    const r = await makeService().importNow(orgId, propertyId, url);
    revalidatePath(`/properties/${propertyId}`);
    const parts: string[] = [];
    if (r.created) parts.push(`${r.created} importate`);
    if (r.updated) parts.push(`${r.updated} aggiornate`);
    if (r.cancelled) parts.push(`${r.cancelled} annullate`);
    if (r.flaggedForReview) parts.push(`${r.flaggedForReview} da verificare`);
    const detail = parts.length ? ` · ${parts.join(" · ")}` : "";
    return { ok: true, message: `Importato ✓ ${r.seen} prenotazioni nel calendario${detail}` };
  } catch (err) {
    if (err instanceof ReservationsError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore durante l'import. Riprova." };
  }
}

/** Sincronizza un feed iCal: importa/aggiorna i soggiorni bozza. */
export async function syncImportAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const importId = String(formData.get("importId") ?? "").trim();

  const orgId = await assertOwnProperty(propertyId);
  if (!orgId) return { ok: false, message: "Immobile non trovato o sessione scaduta." };
  const access = await checkWriteAccess(orgId);
  if (!access.ok) return { ok: false, message: access.message };

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
  const access = await checkWriteAccess(orgId);
  if (!access.ok) return;

  await makeService().removeImport(importId, orgId);
  revalidatePath(`/properties/${propertyId}`);
}

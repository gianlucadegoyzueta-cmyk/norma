"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import type { GuestData, Party, PartyTipo } from "@/server/modules/stays";
import { PrismaStaysRepository, StaysError, StaysService } from "@/server/modules/stays";
import { type PersonInput, validatePerson } from "./guest-validation";
import type { GuestPartyState } from "./types";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

function service(): StaysService {
  return new StaysService(
    new PrismaStaysRepository(prisma),
    new PrismaSchedinaRepository(prisma),
    new PrismaReferenceTablesLoader(prisma),
  );
}

/** Converte un input date "YYYY-MM-DD" (o vuoto) in Date a mezzogiorno UTC, o null. */
function parseDay(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  // Mezzogiorno UTC: evita slittamenti di giorno nel confronto finestra (fuso Europe/Rome).
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Crea un soggiorno. L'organizationId NON arriva dal client: lo prendiamo da getCurrentContext
 * (isolamento). L'immobile dev'essere dell'org e collegato a una credenziale per poter poi
 * generare le schedine (verificato in fase di generazione).
 */
export async function createStayAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const arrivalDate = parseDay(String(formData.get("arrivalDate") ?? ""));
  const departureDate = parseDay(String(formData.get("departureDate") ?? ""));
  const guestsCount = Number.parseInt(String(formData.get("guestsCount") ?? ""), 10);
  const isShortStay = formData.get("isShortStay") === "on";

  if (!propertyId) return { ok: false, message: "Seleziona l'immobile." };
  if (!arrivalDate) return { ok: false, message: "Indica una data di arrivo valida." };
  if (!Number.isFinite(guestsCount) || guestsCount < 1) {
    return { ok: false, message: "Il numero di ospiti dev'essere almeno 1." };
  }

  // Isolamento: l'immobile deve appartenere all'organizzazione corrente.
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { organizationId: true },
  });
  if (!property || property.organizationId !== ctx.current.organizationId) {
    return { ok: false, message: "Immobile non trovato per questa organizzazione." };
  }

  try {
    await service().createStay({
      organizationId: ctx.current.organizationId,
      propertyId,
      arrivalDate,
      departureDate,
      guestsCount,
      isShortStay,
    });
  } catch (err) {
    if (err instanceof StaysError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nella creazione del soggiorno. Riprova." };
  }

  revalidatePath("/stays");
  return { ok: true, message: "Soggiorno creato ✓ — ora aggiungi gli ospiti." };
}

// ----------------------- AGGIUNTA OSPITI -----------------------

/** Verifica che il soggiorno sia dell'org corrente; restituisce l'organizationId o null. */
async function assertStayOwned(stayId: string, organizationId: string): Promise<boolean> {
  const stay = await prisma.stay.findFirst({
    where: { id: stayId, organizationId },
    select: { id: true },
  });
  return stay !== null;
}

/** Legge una stringa dal form, trimmata; "" → undefined. */
function field(formData: FormData, key: string): string | undefined {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? undefined : v;
}

/** Costruisce l'input grezzo della persona `idx` dal form (campi documento inclusi). */
function personInput(formData: FormData, idx: number): PersonInput {
  const p = (k: string) => field(formData, `p${idx}.${k}`);
  return {
    firstName: p("firstName"),
    lastName: p("lastName"),
    sex: p("sex"),
    birthDate: p("birthDate"),
    birthCountryId: p("birthCountryId"),
    citizenshipId: p("citizenshipId"),
    birthComuneId: p("birthComuneId"),
    residenceCountryId: p("residenceCountryId"),
    residenceComuneId: p("residenceComuneId"),
    residenceForeignLocality: p("residenceForeignLocality"),
    tourismType: p("tourismType"),
    transportMeans: p("transportMeans"),
    documentTypeId: p("documentTypeId"),
    documentNumber: p("documentNumber"),
    documentPlaceId: p("documentPlaceId"),
  };
}

/** Valida la persona `idx` (logica pura) e prefissa le chiavi d'errore con l'indice ("p0.lastName"). */
function collectPerson(
  formData: FormData,
  idx: number,
  withDocument: boolean,
): { data: GuestData | null; errors: Record<string, string> } {
  const { data, errors } = validatePerson(personInput(formData, idx), withDocument);
  const prefixed: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) prefixed[`p${idx}.${k}`] = v;
  return { data, errors: prefixed };
}

/**
 * Aggiunge una comitiva (singolo, oppure capo + membri) a un soggiorno. La struttura della
 * comitiva determina i tipi-alloggiato (16/17/18 per capo/singolo, 19/20 per i membri): la logica
 * vive nel dominio (`tipiPerParty`), qui ci limitiamo a costruire il `Party` dal form.
 */
export async function addGuestPartyAction(
  _prev: GuestPartyState | null,
  formData: FormData,
): Promise<GuestPartyState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const stayId = String(formData.get("stayId") ?? "").trim();
  const tipo = String(formData.get("partyTipo") ?? "") as PartyTipo;
  const personCount = Number.parseInt(String(formData.get("personCount") ?? "0"), 10);

  if (!stayId || !(await assertStayOwned(stayId, ctx.current.organizationId))) {
    return { ok: false, message: "Soggiorno non trovato per questa organizzazione." };
  }
  if (tipo !== "SINGOLO" && tipo !== "FAMIGLIA" && tipo !== "GRUPPO") {
    return { ok: false, message: "Tipo comitiva non valido." };
  }
  if (!Number.isFinite(personCount) || personCount < 1) {
    return { ok: false, message: "Nessun ospite da aggiungere." };
  }

  // Valida TUTTE le persone raccogliendo gli errori per campo (niente stop al primo): la UI può
  // evidenziarli tutti e fare scroll al primo. p0 = capo/singolo (con documento); p1.. = membri.
  const fieldErrors: Record<string, string> = {};
  const capo = collectPerson(formData, 0, true);
  Object.assign(fieldErrors, capo.errors);
  const membri: GuestData[] = [];
  if (tipo !== "SINGOLO") {
    for (let i = 1; i < personCount; i++) {
      const m = collectPerson(formData, i, false);
      Object.assign(fieldErrors, m.errors);
      if (m.data) membri.push(m.data);
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Controlla i campi evidenziati qui sotto.", fieldErrors };
  }

  const capoData = capo.data as GuestData;
  const party: Party =
    tipo === "SINGOLO" ? { tipo, ospite: capoData } : { tipo, capo: capoData, membri };

  const svc = service();
  try {
    await svc.addGuests(stayId, ctx.current.organizationId, [party]);
  } catch (err) {
    if (err instanceof StaysError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nell'aggiunta degli ospiti. Riprova." };
  }

  // Auto-generazione best-effort: se gli ospiti sono completi e l'arrivo è in finestra, le schedine
  // sono già pronte (PENDING). Altrimenti (dati mancanti / fuori finestra) non si rompe nulla: l'host
  // le genererà completando i dati. Resta tutto PRE-INVIO (reversibile): nessun invio ad Alloggiati.
  const gen = await svc.tryGenerateSchedine(stayId);
  revalidatePath(`/stays/${stayId}`);
  const ready = "created" in gen ? gen.created + gen.existing : 0;
  const suffix = ready > 0 ? ` · ${ready} schedine pronte` : "";
  return { ok: true, message: `Ospiti aggiunti ✓${suffix}` };
}

// ----------------------- GENERAZIONE SCHEDINE -----------------------

/**
 * Genera le schedine PENDING per un soggiorno (anti-doppione idempotente). Valida tutti gli ospiti
 * prima di persistere: se un ospite ha dati incompleti, NESSUNA schedina viene creata.
 */
export async function generateSchedineAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const stayId = String(formData.get("stayId") ?? "").trim();
  if (!stayId || !(await assertStayOwned(stayId, ctx.current.organizationId))) {
    return { ok: false, message: "Soggiorno non trovato per questa organizzazione." };
  }

  try {
    const res = await service().generateSchedine(stayId);
    revalidatePath(`/stays/${stayId}`);
    if (res.created === 0 && res.existing > 0) {
      return { ok: true, message: `Schedine già generate (${res.existing}). Nessun doppione.` };
    }
    return {
      ok: true,
      message: `Generate ${res.created} schedine PENDING${res.existing > 0 ? ` (${res.existing} già presenti)` : ""}.`,
    };
  } catch (err) {
    if (err instanceof StaysError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nella generazione delle schedine. Riprova." };
  }
}

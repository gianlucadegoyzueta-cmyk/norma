"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { appBaseUrl, sendTransactionalEmail } from "@/server/auth/email";
import { createTeamInviteToken } from "@/server/auth/invite-token";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import { isPillar, PrismaNotificationPreferenceRepository } from "@/server/modules/notifications";

export type ProfileState = { ok: boolean; message: string } | null;
export type TeamState = { ok: boolean; message: string } | null;
export type TeamInviteLinkState = { ok: boolean; message: string; link?: string } | null;

function canManageTeam(role: MembershipRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function parseRole(input: string): MembershipRole | null {
  if (input === "OWNER" || input === "ADMIN" || input === "MEMBER") return input;
  return null;
}

/** Aggiorna il nome dell'utente corrente. Write minimale e sicuro (nessun dato sensibile). */
export async function updateNameAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return { ok: false, message: "Il nome non può essere vuoto." };
  if (name.length > 120) return { ok: false, message: "Nome troppo lungo (max 120 caratteri)." };

  await prisma.user.update({ where: { id: ctx.user.id }, data: { name } });
  revalidatePath("/account");
  return { ok: true, message: "Nome aggiornato ✓" };
}

/**
 * Imposta il consenso alle notifiche push per un singolo pilastro (Alloggiati o Turismo).
 * Granulare e revocabile (safeguard #1): l'host può spegnere un pilastro senza toccare l'altro.
 * Degrada in modo sicuro se la migrazione `NotificationPreference` non è ancora applicata.
 */
export async function setNotificationPreferenceAction(
  pillar: string,
  enabled: boolean,
): Promise<ProfileState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };
  if (!isPillar(pillar)) return { ok: false, message: "Pilastro non valido." };

  const repo = new PrismaNotificationPreferenceRepository(prisma);
  await repo.set(ctx.user.id, pillar, enabled);
  revalidatePath("/account");
  return { ok: true, message: "Preferenza aggiornata ✓" };
}

/** Aggiunge (o aggiorna) un membro del team dell'organizzazione corrente via email + ruolo. */
export async function addTeamMemberAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };
  if (!canManageTeam(ctx.current.role)) {
    return { ok: false, message: "Solo OWNER o ADMIN possono gestire il team." };
  }

  const email = (formData.get("email") ?? "").toString().trim().toLowerCase();
  const role = parseRole((formData.get("role") ?? "").toString().trim());
  if (!email) return { ok: false, message: "Inserisci un'email valida." };
  if (!role) return { ok: false, message: "Ruolo non valido." };
  if (ctx.current.role !== "OWNER" && role === "OWNER") {
    return { ok: false, message: "Solo un OWNER può promuovere a OWNER." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    return {
      ok: false,
      message:
        "Utente non trovato. Chiedi prima di creare l'account, poi potrai aggiungerlo al team.",
    };
  }

  const existing = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: ctx.current.organizationId,
        userId: user.id,
      },
    },
    select: { id: true, role: true },
  });

  if (existing) {
    if (ctx.current.role !== "OWNER" && existing.role === "OWNER") {
      return { ok: false, message: "Un ADMIN non può modificare il ruolo di un OWNER." };
    }
    await prisma.membership.update({ where: { id: existing.id }, data: { role } });
    revalidatePath("/account");
    return { ok: true, message: `Ruolo aggiornato a ${role} per ${user.email}.` };
  }

  await prisma.membership.create({
    data: {
      organizationId: ctx.current.organizationId,
      userId: user.id,
      role,
    },
  });
  try {
    await sendTransactionalEmail({
      to: user.email ?? email,
      subject: `Invito al team ${ctx.current.organizationName} su Norma`,
      text: [
        `Ciao,`,
        ``,
        `sei stato aggiunto al team "${ctx.current.organizationName}" su Norma con ruolo ${role}.`,
        `Accedi da: ${appBaseUrl()}/login`,
        `Se non hai ancora un account: ${appBaseUrl()}/signup`,
      ].join("\n"),
    });
  } catch {
    // Membership già creata: non blocchiamo il flusso team per un errore canale email.
  }
  revalidatePath("/account");
  return { ok: true, message: `${user.email} aggiunto al team come ${role}.` };
}

/** Cambia il ruolo di una membership esistente nell'organizzazione corrente. */
export async function updateTeamRoleAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return;
  if (!canManageTeam(ctx.current.role)) return;

  const membershipId = (formData.get("membershipId") ?? "").toString().trim();
  const role = parseRole((formData.get("role") ?? "").toString().trim());
  if (!membershipId || !role) return;

  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, organizationId: true, role: true, userId: true },
  });
  if (!target || target.organizationId !== ctx.current.organizationId) return;
  if (target.userId === ctx.user.id) return;

  if (ctx.current.role !== "OWNER" && (target.role === "OWNER" || role === "OWNER")) return;

  await prisma.membership.update({ where: { id: target.id }, data: { role } });
  revalidatePath("/account");
}

/** Rimuove un membro dal team dell'organizzazione corrente, con guardrail sugli OWNER. */
export async function removeTeamMemberAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return;
  if (!canManageTeam(ctx.current.role)) return;

  const membershipId = (formData.get("membershipId") ?? "").toString().trim();
  if (!membershipId) return;

  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, organizationId: true, role: true, userId: true },
  });
  if (!target || target.organizationId !== ctx.current.organizationId) return;
  if (target.userId === ctx.user.id) return;

  if (ctx.current.role !== "OWNER" && target.role === "OWNER") return;

  if (target.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: ctx.current.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) return;
  }

  await prisma.membership.delete({ where: { id: target.id } });
  revalidatePath("/account");
}

/** Crea un link invito firmato per utenti esterni (anche non ancora presenti nel DB). */
export async function createTeamInviteLinkAction(
  _prev: TeamInviteLinkState,
  formData: FormData,
): Promise<TeamInviteLinkState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };
  if (!canManageTeam(ctx.current.role)) {
    return { ok: false, message: "Solo OWNER o ADMIN possono invitare membri." };
  }

  const email = (formData.get("email") ?? "").toString().trim().toLowerCase();
  const role = parseRole((formData.get("role") ?? "").toString().trim());
  if (!email) return { ok: false, message: "Inserisci un'email valida." };
  if (!role) return { ok: false, message: "Ruolo non valido." };
  if (ctx.current.role !== "OWNER" && role === "OWNER") {
    return { ok: false, message: "Solo un OWNER può invitare con ruolo OWNER." };
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 giorni
  const token = createTeamInviteToken({
    orgId: ctx.current.organizationId,
    orgName: ctx.current.organizationName,
    email,
    role,
    invitedBy: ctx.user.id,
    exp,
  });
  const link = `${appBaseUrl()}/auth/invite?token=${encodeURIComponent(token)}`;

  try {
    await sendTransactionalEmail({
      to: email,
      subject: `Invito al team ${ctx.current.organizationName} su Norma`,
      text: [
        `Ciao,`,
        ``,
        `sei stato invitato nel team "${ctx.current.organizationName}" con ruolo ${role}.`,
        `Apri questo link per accettare: ${link}`,
        ``,
        `Se non hai ancora un account, puoi crearlo con la stessa email e poi accettare l'invito.`,
      ].join("\n"),
    });
  } catch {
    // Il link resta valido anche se il canale email fallisce: lo restituiamo comunque per copia manuale.
  }

  return { ok: true, message: "Link invito creato.", link };
}

"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { createTicketStore, isSupportAdmin } from "@/server/modules/support";

/** Segna un ticket come risolto. Ri-verifica il gate founder lato server: mai fidarsi del client. */
export async function closeTicketAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx || !isSupportAdmin(ctx.user.email)) notFound();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await createTicketStore().close(id);
  revalidatePath("/admin/support");
}

import { notFound } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { createTicketStore, isSupportAdmin } from "@/server/modules/support";
import { closeTicketAction } from "./actions";

// Sempre fresca: è una inbox operativa, non deve essere cacheata.
export const dynamic = "force-dynamic";

/** Inbox del founder: i ticket aperti dall'assistente AI quando non era sicuro. */
export default async function SupportInboxPage() {
  const ctx = await getCurrentContext();
  // Gate platform-level via allowlist email. Non-founder → 404 (non riveliamo che la pagina esiste).
  if (!ctx || !isSupportAdmin(ctx.user.email)) notFound();

  const tickets = await createTicketStore().listOpen();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Inbox supporto</h1>
        <p className="text-muted-foreground text-sm">
          Ticket aperti dall&apos;assistente quando non era sicuro.{" "}
          {tickets.length === 0 ? "Nessuno da gestire." : `${tickets.length} da gestire.`}
        </p>
      </header>

      {tickets.length === 0 ? (
        <p className="text-sm text-gray-500">Tutto gestito. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium">{t.question}</p>
              <p className="mt-1 text-xs text-gray-500">
                {t.createdAt.toLocaleString("it-IT")} ·{" "}
                {t.organizationId ? `org ${t.organizationId}` : "visitatore"}
              </p>
              {t.conversation.length > 1 && (
                <details className="mt-2 text-sm text-gray-700">
                  <summary className="cursor-pointer text-xs text-gray-500">
                    Conversazione ({t.conversation.length} messaggi)
                  </summary>
                  <div className="mt-1 flex flex-col gap-1">
                    {t.conversation.map((m, i) => (
                      <p key={i}>
                        <span className="text-gray-400">{m.role}:</span> {m.content}
                      </p>
                    ))}
                  </div>
                </details>
              )}
              <form action={closeTicketAction} className="mt-3">
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white"
                >
                  Segna risolto
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

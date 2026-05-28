import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { CredentialForm } from "./CredentialForm";

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: "Attiva ✓", color: "#137333" },
  INVALID: { text: "Non valida ✗", color: "#c5221f" },
  PENDING_REONBOARDING: { text: "Da verificare", color: "#b06000" },
  DISABLED: { text: "Disattivata", color: "#666" },
};

export default async function CredentialsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const credentials = await new PrismaCredentialRepository(prisma).listByOrganization(
    ctx.current.organizationId,
  );

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
        padding: "2.5rem 1.5rem",
        lineHeight: 1.6,
      }}
    >
      <p style={{ margin: 0 }}>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      <h1>Credenziali Alloggiati</h1>
      <p style={{ color: "#555" }}>
        Org <strong>{ctx.current.organizationName}</strong>. Le credenziali (utente/password/WSKey)
        sono salvate <strong>cifrate</strong> nel vault, mai in chiaro. Quando ne aggiungi una, la
        verifichiamo subito con Alloggiati (<em>Authentication_Test</em>) — nessun invio di schedine.
      </p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Le tue credenziali</h2>
        {credentials.length === 0 ? (
          <p style={{ color: "#666" }}>Nessuna credenziale ancora. Aggiungine una qui sotto.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
            {credentials.map((c) => {
              const s = STATUS[c.status] ?? { text: c.status, color: "#666" };
              return (
                <li
                  key={c.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 6,
                    padding: "0.6rem 0.8rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <span>
                    <strong>{c.label}</strong>{" "}
                    <span style={{ color: "#666", fontSize: "0.85rem" }}>
                      · {c.category === "GESTIONE_APPARTAMENTI" ? "gestione appartamenti" : "struttura singola"} · {c.provincia}
                    </span>
                  </span>
                  <span style={{ color: s.color, fontWeight: 600, whiteSpace: "nowrap" }}>{s.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Aggiungi credenziale</h2>
        <CredentialForm />
      </section>
    </main>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { CURRENT_ORG_COOKIE, getCurrentContext } from "@/server/auth/session";

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        lineHeight: 1.6,
      }}
    >
      <h1>Benvenuto, {ctx.user.email ?? ctx.user.name ?? "utente"}.</h1>
      <p>
        Sei in Organization <strong>{ctx.current.organizationName}</strong> — ruolo{" "}
        <strong>{ctx.current.role}</strong>.
      </p>

      {ctx.organizations.length > 1 && (
        <section>
          <h2 style={{ fontSize: "1rem" }}>Cambia Organization</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {ctx.organizations.map((o) => (
              <form
                key={o.organizationId}
                action={async () => {
                  "use server";
                  (await cookies()).set(CURRENT_ORG_COOKIE, o.organizationId);
                  redirect("/dashboard");
                }}
              >
                <button
                  type="submit"
                  disabled={o.organizationId === ctx.current.organizationId}
                  style={{ padding: "0.35rem 0.75rem" }}
                >
                  {o.organizationName} ({o.role})
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        style={{ marginTop: "2rem" }}
      >
        <button type="submit">Esci</button>
      </form>
    </main>
  );
}

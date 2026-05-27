import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 420,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        lineHeight: 1.6,
      }}
    >
      <h1>Accedi</h1>
      <p>Inserisci la tua email: ti invieremo un link per entrare (magic link).</p>
      <form
        action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          if (email) {
            await signIn("nodemailer", { email, redirectTo: "/dashboard" });
          }
        }}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 320 }}
      >
        <input name="email" type="email" required placeholder="tu@esempio.it" style={{ padding: "0.5rem" }} />
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Invia magic link
        </button>
      </form>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        In sviluppo il link viene stampato nella console del server (nessuna email reale necessaria).
      </p>
    </main>
  );
}

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAuthRepository } from "@/server/auth/adapters/PrismaAuthRepository";
import { provisionNewUser } from "@/server/auth/provisioning";
import { prisma } from "@/server/db";

/**
 * Configurazione Auth.js (NextAuth v5).
 *  - Adapter Prisma → utenti/sessioni/token nel DB (sessioni "database").
 *  - Provider EMAIL (magic link). L'invio reale avviene via RESEND (HTTP) se è presente
 *    RESEND_API_KEY; altrimenti (sviluppo) il link è stampato in console. Niente SMTP necessario.
 *  - Al primo accesso (`events.createUser`) si crea automaticamente una Organization + OWNER.
 *
 * Richiede in env: AUTH_SECRET (firma sessioni). In produzione: RESEND_API_KEY + EMAIL_FROM.
 * Vedi .env.example.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Nodemailer({
      from: process.env.EMAIL_FROM ?? "no-reply@compliance.local",
      // `server` è richiesto dal provider ma NON viene usato: l'invio è in sendVerificationRequest
      // (Resend via HTTP). Placeholder per superare la validazione anche senza SMTP.
      server: process.env.EMAIL_SERVER || {
        host: "localhost",
        port: 587,
        auth: { user: "", pass: "" },
      },
      async sendVerificationRequest({ identifier, url, provider }) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          // DEV: nessun invio reale, stampiamo il magic link da cliccare.
          console.log(`\n🔑 [auth] Magic link per ${identifier}:\n${url}\n`);
          return;
        }
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: "Accedi a Compliance Affitti Brevi",
            text: `Accedi cliccando questo link (valido a breve termine):\n\n${url}\n\nSe non hai richiesto l'accesso, ignora questa email.`,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Resend: invio del magic link fallito (HTTP ${res.status}). ${body}`);
        }
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Provisioning della prima Organization (OWNER) al primo accesso.
      if (user.id) {
        await provisionNewUser(
          { id: user.id, email: user.email ?? null },
          new PrismaAuthRepository(prisma),
        );
      }
    },
  },
});

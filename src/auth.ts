import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAuthRepository } from "@/server/auth/adapters/PrismaAuthRepository";
import { normalizeEmail, verifyPassword } from "@/server/auth/password";
import { provisionNewUser } from "@/server/auth/provisioning";
import { prisma } from "@/server/db";

/**
 * Configurazione Auth.js (NextAuth v5). Due metodi di accesso, entrambi brandizzati:
 *  - CREDENTIALS  → email + password (hash bcrypt verificato in `authorize`). Recupero/primo set
 *    password via /auth/forgot (email transazionale dedicata, vedi server/auth/email.ts).
 *  - GOOGLE       → OAuth one-click (attivo SOLO se AUTH_GOOGLE_ID/SECRET sono presenti).
 *
 * (Il magic link via email è stato RIMOSSO: ridondante con password+reset, attrito maggiore nell'uso
 * ricorrente e un canale email in più da mantenere. Un utente Google senza password può comunque
 * impostarne una dal flusso /auth/forgot.)
 *
 * ── Strategia di sessione: JWT (non più "database"). ──────────────────────────────────────────
 * Il provider Credentials di Auth.js v5 NON è compatibile con le sessioni "database": richiede JWT.
 * Conseguenze gestite qui:
 *  - i callback `jwt`/`session` propagano `user.id` nel token e poi in `session.user.id`, da cui
 *    dipende `getCurrentContext()` per risolvere l'Organization corrente;
 *  - l'isolamento multi-tenant resta intatto: le Organization si rileggono SEMPRE dal DB ad ogni
 *    richiesta (vedi session.ts), il token porta solo l'id utente;
 *  - `events.createUser` (provisioning org) scatta quando l'ADAPTER crea l'utente → vale per Google.
 *    Per la registrazione email+password il provisioning è esplicito nella server action di
 *    registrazione (Credentials bypassa l'adapter), quindi nessun doppio-provisioning.
 *  - TRADE-OFF: le sessioni JWT non sono revocabili server-side fino a scadenza. Accettabile per un
 *    tool a uso ricorrente con "ricordami"; follow-up possibile: `tokenVersion` su User.
 *
 * Richiede in env: AUTH_SECRET. Prod: RESEND_API_KEY + EMAIL_FROM (email di reset). Opzionale:
 * AUTH_GOOGLE_ID/SECRET.
 */

/** Sessione "ricordami": 30 giorni. Un tool di compliance si usa a ondate, non vogliamo ri-login continui. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Dominio di produzione dietro il proxy di Vercel: fidati dell'host della richiesta così i
  // callback OAuth usano l'URL canonico (https://norma.casa, da AUTH_URL) e non l'host *.vercel.app.
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: {
    signIn: "/login",
    error: "/auth/error", // OAuth negato, account-not-linked, ecc.
  },
  providers: [
    Credentials({
      // I campi servono solo a Auth.js per il form di default (che NON usiamo: abbiamo /login nostro).
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = normalizeEmail(String(raw?.email ?? ""));
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Utente inesistente OPPURE senza password (solo Google) → login negato. Niente messaggi
        // che rivelino quale dei due: si restituisce sempre lo stesso esito.
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    // Google attivo solo se configurato: in dev (senza credenziali) il bottone resta nascosto.
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    // Al primo accesso `user` è presente: portiamo l'id nel token (sopravvive nel cookie JWT).
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    // Ricostruiamo `session.user.id` dal token, da cui dipende getCurrentContext().
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? session.user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Provisioning della prima Organization (OWNER) quando l'adapter crea l'utente (Google).
      // Per la registrazione email+password il provisioning è nella server action.
      if (user.id) {
        await provisionNewUser(
          { id: user.id, email: user.email ?? null },
          new PrismaAuthRepository(prisma),
        );
      }
    },
  },
});

/** Esposto alla UI: indica se mostrare il bottone "Continua con Google". */
export const isGoogleEnabled = googleEnabled;

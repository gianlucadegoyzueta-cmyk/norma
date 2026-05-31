# Auth & Onboarding — CHANGELOG di lavoro

Rifacimento di accesso/registrazione (multi-metodo, brandizzato) e onboarding a wizard.
Branch: `feat/auth-onboarding`. Lingua UI: italiano. Stile: pulito/fiducioso (Linear/Stripe).

---

## FASE A — Auth multi-metodo, brandizzato

### Cosa è stato fatto

- **Sessione: `database` → `jwt`** ([src/auth.ts](src/auth.ts)). Obbligatorio per il provider
  Credentials in Auth.js v5. Aggiunti i callback `jwt` (porta `user.id` nel token) e `session`
  (ricostruisce `session.user.id` da `token.id`/`token.sub`), da cui dipende `getCurrentContext()`.
- **Tre provider**: `Credentials` (email+password, hash bcrypt verificato in `authorize`),
  `Google` (attivo solo se `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` presenti) e `Nodemailer`
  (magic link, invariato). `pages.verifyRequest` → `/auth/check-email`, `pages.error` → `/auth/error`.
- **Hash password** ([src/server/auth/password.ts](src/server/auth/password.ts)): `bcryptjs`
  (pure-JS, cost 12), regole di validazione in italiano, normalizzazione email. Mai in chiaro/loggata.
- **Registrazione** ([src/app/signup/actions.ts](src/app/signup/actions.ts)): valida → crea utente
  con `passwordHash` → **provisioning org col nome reale** → login immediato (MVP).
- **Password dimenticata (flusso completo)**: token monouso con hash SHA-256 a DB
  ([src/server/auth/password-reset.ts](src/server/auth/password-reset.ts)), invio via Resend
  ([src/server/auth/email.ts](src/server/auth/email.ts)), pagine `/auth/forgot` e `/auth/reset`.
- **Pagine brandizzate** (sostituiscono ogni default NextAuth): `/login` (tab Password · Magic link
  + Google + link a registrazione), `/signup`, `/auth/check-email`, `/auth/error`, `/auth/forgot`,
  `/auth/reset`. Componenti UI nuovi e leggeri: `Tabs`, `Spinner`, `Field`/`FormMessage`,
  `SubmitButton`, `AuthShell`, `GoogleButton`, `AuthDivider`.
- **"Ricordami"**: `session.maxAge` = 30 giorni.

### Migrazione Prisma (GENERATA, non applicata)

- `prisma/migrations/20260531000000_add_password_auth/` — `User.passwordHash` + tabella
  `PasswordResetToken`. **Da applicare a mano**: `npx prisma migrate deploy`.

### Assunzioni / scelte

- **Login immediato post-registrazione** (MVP): l'utente entra subito; `emailVerified` resta null.
  La verifica email è "predisposta" (l'utente può sempre validare via magic link) ma non blocca.
- **Anti-enumerazione**: login e "password dimenticata" non rivelano se un'email è registrata.
- Il reset password funziona anche per utenti senza password (magic link/Google): è un modo pulito
  per impostarne una la prima volta.

### Trade-off / follow-up

- Le **sessioni JWT non sono revocabili** server-side fino a scadenza (le "database" lo erano).
  Accettabile per un tool a uso ricorrente; follow-up possibile: campo `tokenVersion` su `User`
  controllato nel callback `jwt` per invalidare in massa.
- **Email di verifica indirizzo** vera e propria (token + pagina dedicata): follow-up, non MVP.
- Per Google in produzione servono `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` in env (vedi `.env.example`).

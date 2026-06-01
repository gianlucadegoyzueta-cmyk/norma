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
  - Google + link a registrazione), `/signup`, `/auth/check-email`, `/auth/error`, `/auth/forgot`,
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

---

## FASE C — Onboarding a wizard

### Cosa è stato fatto

- **Wizard a tutto schermo** ([src/app/onboarding/](src/app/onboarding/)) che sostituisce la
  checklist: una cosa per schermata, stepper, avanti/indietro, "Esci" (niente vicoli ciechi),
  transizioni fluide via **View Transitions API** (con fallback). Step: 0 Benvenuto · 1 La tua
  attività · 2 Collega Alloggiati · 3 Primo immobile · 4 Pronto.
- **Stato derivato + ripresa refresh-safe**: i passi "duri" restano derivati da `getOnboardingState`;
  i passi "soft" (tipo utente, n° strutture, welcome/identity, ultimo step) vivono su
  `OnboardingProgress`. `computeCurrentStep` (puro, testato) unisce le due fonti → alla riapertura
  si riparte dal primo passo non completato.
- **Autosave per step**: ogni step persiste i suoi dati con una server action dedicata
  ([actions.ts](src/app/onboarding/actions.ts)); la navigazione salva l'ultimo step (`setStepAction`).
- **Step 2 (fiducia)**: copy sul perché servono le credenziali + "dove trovo la WSKey?"; verifica
  live (Authentication_Test) riusando `CredentialService`; **sync tabelle AUTOMATICA e invisibile**
  subito dopo (solo wiring di `TableSyncService`/`SoapTabellaClient`, **nessuna modifica al dominio**),
  saltata se le tabelle sono già pronte.
- **Step 3**: provincia **vincolata dalla credenziale** (Comuni ristretti, no errore-dopo) +
  **typeahead** accessibile con "nessuna corrispondenza" (`ComuneTypeahead`, wizard-local).
- **Step 4**: chiusura rassicurante con due strade ("Crea il primo soggiorno" / "Vai alla dashboard").

### Migrazione Prisma (GENERATA, non applicata)

- `prisma/migrations/20260531100000_add_onboarding_progress/` — enum `OnboardingUserType` + tabella
  `OnboardingProgress` (1:1 con Organization). **Da applicare a mano**: `npx prisma migrate deploy`.

## FASE D — Contorno

- `loading.tsx` + `error.tsx` su `/onboarding`, `/login`, `/signup`, `/auth` (componenti condivisi
  `AuthRouteLoading`/`AuthRouteError`); `not-found.tsx` globale brandizzata.

### Assunzioni / scelte (C/D)

- **Sync awaited**: dopo la verifica si attende la sync mostrando "Preparo i comuni…", così lo step 3
  ha sempre i Comuni pronti. Caso comune (tabelle globali già presenti) → istantaneo/invisibile; primo
  sync assoluto ~minuti (idempotente). Se la sync fallisce: "Riprova" oppure "Salta e prosegui".
- **`ComuneTypeahead` wizard-local**: la ComboBox accessibile equivalente vive sul branch UX
  (`feat/ux-fixes`); qui un componente dedicato evita di accoppiare i due branch.
- **`not-found.tsx`** è creata anche qui (scelta esplicita): si sovrappone a quella di `feat/ux-fixes`
  → al merge se ne tiene una (conflitto banale).

### Trade-off / follow-up (C/D)

- **typecheck**: il wizard usa `prisma.onboardingProgress` → richiede `prisma generate` dopo la
  migrazione. In locale `prisma generate` è bloccato (node_modules iCloud) → verifica su CI/Vercel.
  `npm test` (logica pura `computeCurrentStep`) resta verde.
- Progresso a fasi più granulare nello step 2 (verifica vs sync) già distinto; ulteriori micro-stati
  (es. % comuni) sono un follow-up.

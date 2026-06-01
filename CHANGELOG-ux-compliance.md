# UX flussi compliance — CHANGELOG di lavoro

Miglioramenti UX dei flussi a rischio legale (invio irreversibile, scadenze, stati da
verificare/respinti). **Nessuna modifica alla logica di dominio/sicurezza** (`src/server/modules/*`):
solo presentazione, arricchimento dei ritorni delle server action, e nuove rotte UI.
Branch: `feat/auth-onboarding` (stessa corsia dell'altra lane). Un commit per finding.

---

## Finding risolti

1. **Report invio riga-per-riga** (`feat d32993b`). `sendCredentialAction` arricchito con un
   riepilogo strutturato (acquisite / respinte / da verificare + dettaglio respinte), derivato
   rileggendo gli stati delle schedine DOPO `processCredentialBatch` (cattura degli id PENDING
   prima, rilettura con `listForOrganization` dopo). UI con conteggi su token semantici. Mappa
   codici errore in `error-codes.ts`. Test: `send-summary.test.ts`.
2. **UNVERIFIED: spiegazione + niente re-invio** (`feat 728a4bc`). `UnverifiedNote` (disclosure
   nativa accessibile) accanto al badge "Da verificare" in `/schedine` e nel dettaglio soggiorno.
   Nessun pulsante di re-invio su UNVERIFIED.
3. **Correzione REJECTED** (`feat 2f9f685`). Messaggi azionabili (mappa codici + fallback grezzo),
   `reopenRejectedAction` (REJECTED→PENDING via `applyDecision`, transizione già nel dominio),
   "Correggi" → soggiorno, "Rimetti in coda". Test: `error-codes.test.ts`.
4. **Banner overdue in dashboard** (`feat 1d64328`). Helper condiviso `lib/schedina-status.ts`
   (`OPEN_SCHEDINA_STATUSES` + `isOverdue`), conteggio a livello DB, banner d'allerta in cima —
   PRIMA del banner di onboarding. Test: `schedina-status.test.ts`.
5. **Attrito sull'invio senza Test** (`feat 1b0e783`). Senza un Test positivo in sessione, la
   conferma richiede una checkbox obbligatoria ("Test non eseguito… confermo"). Non blocca del tutto.
6. **ComboBox accessibile** (`feat 0d9fbbf`). Nuovo `ui/combobox.tsx` (ARIA combobox/listbox,
   frecce/Invio/Esc, filtro con risultati capati a 50, "nessuna corrispondenza", errore via
   aria-describedby). Sostituisce il `<datalist>` nativo (pesante con ~8k comuni).
7. **Errori ospite per campo + scroll** (`feat 3d8be4e`). `guest-validation.ts` (puro, testato)
   raccoglie tutti gli errori per campo; `addGuestPartyAction` ritorna `fieldErrors`; il form
   evidenzia i campi (aria-invalid/describedby), riepilogo in cima e scroll/focus al primo errore.
   Test: `guest-validation.test.ts`.
8. **loading / error / not-found** (`feat 1209117`). `Skeleton`/`PageSkeleton`/`RouteError`
   condivisi; `loading.tsx` + `error.tsx` su `/schedine`, `/stays`, `/stays/[id]`, `/credentials`;
   `not-found.tsx` globale brandizzata.
9. **A11y + mobile** (`feat 3d69ed3`). Skip-link in `SiteHeader` → `#main-content` (id+tabindex sui
   `<main>`); `aria-hidden` sulle icone decorative (dashboard + componenti toccati); controlli
   outbox in stack pieno-larghezza su mobile, etichetta conferma accorciata.

## Assunzioni / scelte

- **`stayId` per "Correggi"** e **id schedina/errori nel dettaglio soggiorno**: risolti con query a
  livello di pagina (Server Component, `prisma` diretto), per NON modificare gli adapter del dominio.
- **Riepilogo invio**: derivato dagli stati persistiti, riusando metodi repo esistenti
  (`listPendingByCredential` + `listForOrganization`). L'outbox resta `void`/invariato.
- **Mappa codici errore**: solo i codici evidenziati (es. 11, 12) → messaggio azionabile; per tutti
  gli altri si ricade SEMPRE sulla descrizione grezza del portale (mai inventata).
- **Contrasto warning**: nei flussi compliance il testo "warning" usa già `--warning-foreground`
  (AA+ su chiaro; `dark:text-warning` su scuro); `--warning` è riservato a sfondi/bordi.

## Verifica (vincolo ambientale)

- **`npm test` verde** dopo ogni finding con logica testabile: `send-summary`, `error-codes`,
  `schedina-status`, `guest-validation` passano (+ suite esistente invariata). I "7 errors"
  occasionali di vitest sono il quirk noto da spazio-nel-path (worker timeout su letture a freddo),
  **non** fallimenti reali.
- **`typecheck` e `lint` non eseguibili in locale**: `prisma generate` e il caricamento dei plugin
  ESLint si bloccano sulle letture di `node_modules` sincronizzato da iCloud (problema documentato).
  Vanno eseguiti su Vercel/CI. **Nessun push** finché non sono verdi lì. Il codice non aggiunge
  campi Prisma (questa lane non tocca lo schema), quindi non dipende dalla rigenerazione del client.

## Follow-up

- `aria-hidden`: applicato ai componenti toccati e alla dashboard; uno sweep delle icone decorative
  sulle pagine legacy residue è un follow-up minore.
- ComboBox: eventuale ricerca server-side se il dataset crescesse molto oltre i comuni italiani.

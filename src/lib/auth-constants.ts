/**
 * Costanti di autenticazione condivise tra client e server (nessuna dipendenza nativa qui,
 * così sono importabili anche dai componenti client senza trascinare bcrypt nel bundle).
 *
 * Sorgente unica per la regola "lunghezza minima password" e per il testo d'aiuto mostrato
 * nei form: server (`validatePassword`) e client (hint nei form di signup/reset) restano
 * sempre allineati — niente più stringhe duplicate che divergono nel tempo.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // limite tecnico di bcrypt (byte): oltre, l'hash ignorerebbe il resto.

/** Testo d'aiuto sotto il campo password, coerente con `validatePassword()`. */
export const PASSWORD_RULES_HINT = `Almeno ${PASSWORD_MIN_LENGTH} caratteri, con lettere e numeri.`;

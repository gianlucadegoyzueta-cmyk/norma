import bcrypt from "bcryptjs";

/**
 * Hashing e validazione delle password.
 *  - Algoritmo: bcrypt (via bcryptjs, pure-JS → nessun binding nativo da compilare,
 *    sicuro con build serverless/iCloud). La password in chiaro NON viene mai persistita né loggata.
 *  - Cost factor 12: buon compromesso sicurezza/latenza per un login interattivo.
 *  - bcrypt tronca oltre i 72 byte: lo impediamo a monte con un limite di lunghezza esplicito.
 */
const BCRYPT_COST = 12;
const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // limite tecnico di bcrypt (byte). Oltre, l'hash ignorerebbe il resto.

export const PASSWORD_RULES_HINT = `Almeno ${MIN_LENGTH} caratteri, con lettere e numeri.`;

/**
 * Valida una password secondo regole chiare e prevedibili. Restituisce un messaggio d'errore
 * in italiano (azionabile) oppure `null` se la password va bene.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `La password deve avere almeno ${MIN_LENGTH} caratteri.`;
  }
  if (password.length > MAX_LENGTH) {
    return `La password è troppo lunga (massimo ${MAX_LENGTH} caratteri).`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "La password deve contenere almeno una lettera.";
  }
  if (!/[0-9]/.test(password)) {
    return "La password deve contenere almeno un numero.";
  }
  return null;
}

/** Normalizza e valida un'email. Restituisce l'email normalizzata o `null` se non valida. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  // Validazione volutamente semplice: la verità la dà comunque l'invio email.
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

/** Calcola l'hash bcrypt della password (operazione asincrona, costosa per design). */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verifica una password contro l'hash. Resistente al timing per costruzione di bcrypt.
 * Tollerante: se l'hash è assente/corrotto restituisce `false` invece di lanciare.
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

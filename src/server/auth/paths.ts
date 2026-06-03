const PUBLIC_EXACT = new Set<string>(["/favicon.ico"]);
// Pagine raggiungibili da SLOGGATI: login, registrazione, l'intero flusso /auth/* (recupero
// password, "controlla email", reset, pagina d'errore di Auth.js), gli endpoint di Auth.js e gli
// asset di Next. Sotto /auth non esistono route autenticate, quindi il prefisso è sicuro.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/api/auth", "/_next"];

/**
 * True se la route è PUBBLICA (non richiede autenticazione): login/registrazione, il flusso auth
 * (recupero password, magic link, errori), gli endpoint di Auth.js e gli asset di Next. Tutto il
 * resto è protetto dal middleware.
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

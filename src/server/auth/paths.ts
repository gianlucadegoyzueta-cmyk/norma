const PUBLIC_EXACT = new Set<string>(["/favicon.ico"]);
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/_next"];

/**
 * True se la route è PUBBLICA (non richiede autenticazione): la pagina di login, gli endpoint
 * di Auth.js, e gli asset di Next. Tutto il resto è protetto dal middleware.
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

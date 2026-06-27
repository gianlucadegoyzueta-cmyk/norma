// `/api/health` è pubblico apposta: endpoint di monitoraggio (status/uptime, niente dati), deve
// rispondere 200 anche senza sessione per load balancer / uptime-check esterni.
// `/api/cron/*`: invocate dal cron di Vercel (nessuna sessione utente); NON sono "aperte" — ogni
// route esige `Authorization: Bearer $CRON_SECRET` ed è DISATTIVATA di default (env flag). Senza
// questo allowlist il middleware auth le rediretterebbe a /login (307) prima del loro gate, e il
// cron non partirebbe mai nemmeno da attivato.
const PUBLIC_EXACT = new Set<string>([
  "/favicon.ico",
  "/icon.svg",
  "/manifest.webmanifest",
  "/api/health",
  "/api/cron/alloggiati",
  "/api/cron/digest",
  "/api/cron/istat",
  "/api/cron/reservations",
  "/.well-known/apple-app-site-association",
  "/.well-known/assetlinks.json",
]);
// Pagine raggiungibili da SLOGGATI: login, registrazione, l'intero flusso /auth/* (recupero
// password, "controlla email", reset, pagina d'errore di Auth.js), il CHECK-IN ospite self-service
// (/checkin/[token], link pubblico), gli endpoint di Auth.js e gli asset di Next.
// `/api/webhooks/*` è pubblico: i webhook esterni (es. Stripe) arrivano senza sessione e si
// autenticano da soli verificando la FIRMA del payload, non un cookie.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/checkin",
  "/api/auth",
  "/api/webhooks",
  "/_next",
];

/**
 * True se la route è PUBBLICA (non richiede autenticazione): login/registrazione, il flusso auth
 * (recupero password, errori), gli endpoint di Auth.js e gli asset di Next. Tutto il
 * resto è protetto dal middleware.
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

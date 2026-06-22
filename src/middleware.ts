import { type NextRequest, NextResponse } from "next/server";
import { isPublicPath } from "@/server/auth/paths";

// Cookie di sessione Auth.js (v5). In produzione (HTTPS) il nome ha il prefisso __Secure-.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Prima linea di protezione — EDGE-SAFE: qui NON importiamo Auth.js/Prisma (girerebbero sul
 * runtime Edge, che non supporta le loro API Node). Controlliamo solo la PRESENZA del cookie di
 * sessione e reindirizziamo a /login se assente.
 *
 * La validazione AUTORITATIVA della sessione (contro il DB) e l'isolamento per Organization sono
 * server-side in `getCurrentContext` (usato nelle pagine): questo middleware è solo un redirect
 * rapido per chi non ha proprio una sessione.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Anteprime di sviluppo (`/dev/*`): raggiungibili senza login SOLO fuori produzione.
  // Le pagine stesse fanno `notFound()` in produzione, ma qui evitiamo pure il redirect.
  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/")) {
    return NextResponse.next();
  }
  if (isPublicPath(pathname)) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Esclude asset statici e immagini ottimizzate.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

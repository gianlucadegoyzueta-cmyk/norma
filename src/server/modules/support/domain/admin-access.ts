// Accesso all'inbox di supporto. Norma non ha un ruolo "founder" globale (i ruoli sono per-org:
// OWNER/ADMIN/MEMBER), mentre i ticket sono cross-org. Quindi l'inbox platform-level è protetta
// da un'allowlist di email via env. Allowlist vuota → NESSUN accesso (secure-by-default).

/** True se l'email è nell'allowlist SUPPORT_ADMIN_EMAILS (comma-separated, case-insensitive). */
export function isSupportAdmin(email: string | null): boolean {
  if (!email) return false;
  const allow = (process.env.SUPPORT_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

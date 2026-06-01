/**
 * Invio email transazionali (reset password, ecc.) tramite RESEND via HTTP — stessa strategia del
 * magic link in src/auth.ts: niente SMTP. In sviluppo, senza RESEND_API_KEY, il contenuto è
 * stampato in console (nessuna email reale necessaria).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "no-reply@norma.casa";

  if (!apiKey) {
    console.log(`\n✉️  [auth] Email per ${opts.to} — ${opts.subject}:\n${opts.text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend: invio email fallito (HTTP ${res.status}). ${body}`);
  }
}

/** URL canonico dell'app per costruire i link nelle email (coerente con AUTH_URL dei magic link). */
export function appBaseUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

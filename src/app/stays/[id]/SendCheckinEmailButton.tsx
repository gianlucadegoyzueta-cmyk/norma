"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCheckinLinkEmailAction } from "./email-actions";

/**
 * Azione MANUALE (mai automatica): l'host inserisce l'email di contatto della prenotazione
 * e invia il link di check-in. Dopo l'invio mostra un timbro "INVIATA ✓" sobrio (stile Concierge).
 */
export function SendCheckinEmailButton({ stayId }: { stayId: string }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [locale, setLocale] = useState<"it" | "en">("it");
  const [sent, setSent] = useState<"invite" | "reminder" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSend() {
    setError(null);
    start(async () => {
      const res = await sendCheckinLinkEmailAction(stayId, email, locale);
      if (res.ok) setSent(res.kind);
      else setError(res.error);
    });
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2">
        <span className="border-primary/40 text-primary inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium tracking-wide uppercase">
          Inviata ✓
        </span>
        <span className="text-muted-foreground text-xs">
          {sent === "reminder" ? "Promemoria inviato all'ospite." : "Invito inviato all'ospite."}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setSent(null);
            setEmail("");
          }}
        >
          Invia ad un altro indirizzo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="email dell'ospite"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
          aria-label="Email dell'ospite"
        />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as "it" | "en")}
          className="border-input bg-background text-muted-foreground h-9 rounded-md border px-2 text-sm"
          aria-label="Lingua dell'email"
        >
          <option value="it">IT</option>
          <option value="en">EN</option>
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSend}
          disabled={pending || email.trim().length === 0}
        >
          <Mail className="size-4" aria-hidden />
          {pending ? "Invio…" : "Invia link via email"}
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutPlan = "ANNUAL" | "MONTHLY";

async function openExternal(url: string, native: boolean): Promise<void> {
  if (native) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      // fallback web redirect sotto
    }
  }
  window.location.assign(url);
}

export function BillingStripeButton({
  mode,
  plan,
  configured,
  label,
  variant = "default",
}: {
  mode: "checkout" | "portal";
  plan?: CheckoutPlan;
  configured: boolean;
  label: string;
  variant?: "default" | "outline";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(): Promise<void> {
    if (!configured || pending) return;
    setPending(true);
    setError(null);
    try {
      const endpoint =
        mode === "checkout" ? "/api/billing/checkout-url" : "/api/billing/portal-url";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: mode === "checkout" ? JSON.stringify({ plan }) : undefined,
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError("Nessun cliente Stripe collegato: attiva prima un abbonamento.");
          return;
        }
        setError("Non riesco ad aprire Stripe ora. Riprova tra poco.");
        return;
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) {
        setError("Risposta non valida dal server billing.");
        return;
      }
      const native = await import("@/lib/native").then((n) => n.isNative());
      await openExternal(payload.url, native);
    } catch {
      setError("Errore di rete: riprova.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        className="w-full"
        variant={variant}
        disabled={!configured || pending}
        onClick={onClick}
      >
        <CreditCard /> {pending ? "Apro Stripe…" : label}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <p className="text-muted-foreground text-[11px]">
        In app mobile il pagamento si apre nel browser di sistema.
      </p>
    </div>
  );
}

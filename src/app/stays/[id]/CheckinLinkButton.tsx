"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateCheckinLinkAction } from "./checkin-actions";

/** Genera e mostra il link pubblico di check-in da condividere con l'ospite (copia negli appunti). */
export function CheckinLinkButton({ stayId }: { stayId: string }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onGenerate() {
    setError(null);
    setCopied(false);
    start(async () => {
      const res = await generateCheckinLinkAction(stayId);
      if (res.ok) setUrl(res.url);
      else setError(res.error);
    });
  }

  async function onCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onGenerate} disabled={pending}>
        <Link2 className="size-4" aria-hidden />
        {url ? "Genera un nuovo link" : "Genera link check-in"}
      </Button>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      {url && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="border-input bg-muted/40 text-muted-foreground h-9 w-full rounded-md border px-3 text-xs"
            aria-label="Link di check-in"
          />
          <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
            {copied ? "Copiato ✓" : "Copia"}
          </Button>
        </div>
      )}
    </div>
  );
}

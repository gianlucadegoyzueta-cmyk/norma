"use client";

import { type FormEvent, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, Loader2, Moon, Search, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { confirmImportAction, previewImportAction } from "./actions";
import type { PreviewItem } from "./ical-types";

type Preview = {
  url: string;
  sourceLabel: string;
  total: number;
  blocked: number;
  items: PreviewItem[];
};

function StatusLine({ ok, message }: { ok: boolean; message: string }) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 text-sm font-medium",
        ok ? "text-success" : "text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
      {message}
    </p>
  );
}

/**
 * Wizard import iCal con anteprima: incolli l'URL → Norma mostra le prenotazioni trovate
 * (date, notti) PRIMA di importare → confermi → import con riepilogo. Migliora il flusso
 * "collega poi sincronizza" unendolo in un solo gesto, con stati di errore gentili.
 */
export function ICalWizard({ propertyId }: { propertyId: string }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runPreview(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const trimmed = url.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await previewImportAction({ propertyId, url: trimmed });
      if (!res.ok) {
        setError(res.message);
        setPreview(null);
        return;
      }
      setPreview({ url: trimmed, ...res });
    });
  }

  function confirm() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmImportAction({ propertyId, url: preview.url });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPreview(null);
      setUrl("");
      setDone(res.message);
    });
  }

  // ── Fase 2: anteprima ────────────────────────────────────────────────────
  if (preview) {
    const { total, blocked, items, sourceLabel } = preview;
    return (
      <div className="grid gap-3">
        <div>
          <p className="font-medium">
            {total > 0
              ? `${total} ${total === 1 ? "prenotazione trovata" : "prenotazioni trovate"}`
              : "Nessuna prenotazione trovata"}
          </p>
          <p className="text-muted-foreground text-xs">
            {sourceLabel}
            {blocked > 0 ? ` · ${blocked} date bloccate ignorate` : ""}
          </p>
        </div>

        {total === 0 ? (
          <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            {blocked > 0
              ? "Il calendario contiene solo date bloccate: nessuna prenotazione da importare."
              : "Il calendario è vuoto o non contiene prenotazioni. Controlla di aver copiato il link giusto."}
          </div>
        ) : (
          <ul className="grid max-h-72 gap-2 overflow-y-auto">
            {items.map((it) => (
              <li
                key={it.uid}
                className="border-border/60 flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                  {it.arrival}
                  {it.departure ? ` → ${it.departure}` : ""}
                </p>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  {it.nights ? (
                    <>
                      <Moon className="size-3" />
                      {it.nights} {it.nights === 1 ? "notte" : "notti"}
                    </>
                  ) : (
                    (it.summary ?? "prenotazione")
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {total > 0 && (
          <p className="text-muted-foreground text-xs">
            Gli ospiti li inserisci tu dopo l&apos;import: Norma crea i soggiorni in bozza, pronti
            da completare.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {total > 0 && (
            <Button type="button" onClick={confirm} disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isPending
                ? "Importo…"
                : `Importa ${total} ${total === 1 ? "prenotazione" : "prenotazioni"}`}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            disabled={isPending}
          >
            {total > 0 ? "Annulla" : "Cambia link"}
          </Button>
        </div>

        {error && <StatusLine ok={false} message={error} />}
      </div>
    );
  }

  // ── Fase 1: incolla l'URL ─────────────────────────────────────────────────
  return (
    <form onSubmit={runPreview} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="ical-url">URL del calendario iCal</Label>
        <Input
          id="ical-url"
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.airbnb.it/calendar/ical/…"
        />
        <p className="text-muted-foreground text-xs">
          Su Airbnb: Calendario → Disponibilità → «Esporta calendario». Su Booking.com: Calendario →
          «Esporta». Incolla qui il link: Norma ti mostra le prenotazioni trovate prima di
          importarle.
        </p>
      </div>
      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        {isPending ? "Cerco le prenotazioni…" : "Cerca le prenotazioni"}
      </Button>
      {error && <StatusLine ok={false} message={error} />}
      {done && <StatusLine ok message={done} />}
    </form>
  );
}

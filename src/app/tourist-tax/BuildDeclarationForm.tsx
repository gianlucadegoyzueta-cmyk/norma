"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildDeclarationAction } from "./actions";

/**
 * Form per costruire/ricalcolare una dichiarazione: comune (tra quelli dove l'org ha strutture)
 * e periodo ("YYYY-MM" mese, "YYYY-Qn" trimestre, "YYYY" anno) — un campo guidato, per non
 * vincolare la cadenza del comune.
 */
export function BuildDeclarationForm({ comuni }: { comuni: Array<{ id: string; name: string }> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await buildDeclarationAction(formData);
      if (res.ok) {
        const skipped = res.skipped > 0 ? ` (${res.skipped} senza regola, esclusi)` : "";
        setMsg({
          ok: true,
          text: `Dichiarazione aggiornata: ${res.staysCount} soggiorni${skipped}.`,
        });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="comuneId">Comune</Label>
          <Select id="comuneId" name="comuneId" required className="w-56">
            {comuni.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="period">Periodo</Label>
          <Input
            id="period"
            name="period"
            required
            placeholder="2026-05 · 2026-Q2 · 2026"
            pattern="\d{4}(-\d{2}|-Q[1-4])?"
            className="w-48"
          />
        </div>
        <Button type="submit" disabled={pending || comuni.length === 0}>
          {pending ? "Calcolo…" : "Calcola dichiarazione"}
        </Button>
      </div>
      {comuni.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Nessun comune disponibile: aggiungi prima una struttura con un comune.
        </p>
      )}
      {msg && (
        <p className={msg.ok ? "text-success text-sm" : "text-destructive text-sm"} role="status">
          {msg.text}
        </p>
      )}
    </form>
  );
}

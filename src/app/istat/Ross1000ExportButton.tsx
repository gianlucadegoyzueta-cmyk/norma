"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportRoss1000XmlAction } from "./actions";

// Etichette leggibili per i campi mancanti del tracciato Ross1000.
const FIELD_LABELS: Record<string, string> = {
  struttura: "struttura non configurata",
  codice: "codice struttura",
  cameredisponibili: "camere disponibili",
  lettidisponibili: "letti disponibili",
  cittadinanza: "cittadinanza ospite",
  statoresidenza: "stato di residenza ospite",
  luogoresidenza: "luogo di residenza ospite",
  tipoturismo: "tipo turismo",
  mezzotrasporto: "mezzo di trasporto",
  idcapo: "capogruppo",
};

/**
 * Scarica il file XML Ross1000 di UNA struttura per il mese (FILE_EXPORT): l'operatore lo carica
 * al portale regionale. Se il report è incompleto mostra i dati mancanti (mai si genera con dati inventati).
 */
export function Ross1000ExportButton({
  propertyId,
  period,
}: {
  propertyId: string;
  period: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);

  function onClick() {
    setError(null);
    setMissing(null);
    start(async () => {
      const res = await exportRoss1000XmlAction(propertyId, period);
      if (res.ok) {
        const blob = new Blob([res.content], { type: "application/xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      setError(res.error);
      if (res.missing) {
        setMissing([...new Set(res.missing.map((m) => FIELD_LABELS[m.field] ?? m.field))]);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        Scarica XML
      </Button>
      {error && (
        <span className="text-destructive max-w-xs text-right text-xs" role="alert">
          {error}
          {missing && missing.length > 0 ? ` Mancano: ${missing.join(", ")}.` : ""}
        </span>
      )}
    </div>
  );
}

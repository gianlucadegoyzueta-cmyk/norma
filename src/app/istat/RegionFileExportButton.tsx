"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { RegionSerializerId } from "@/server/modules/istat/regional/routing";
import { exportRoss1000XmlAction, exportSpotXmlAction, exportUmbriaC59Action } from "./actions";

// Etichette leggibili per i campi mancanti dei tracciati regionali (Ross1000/SPOT/Turismatica).
// Fallback al nome grezzo del campo se non mappato: meglio un'etichetta tecnica che niente.
const FIELD_LABELS: Record<string, string> = {
  struttura: "struttura non configurata",
  codice: "codice struttura",
  cameredisponibili: "camere disponibili",
  lettidisponibili: "letti disponibili",
  cittadinanza: "cittadinanza ospite",
  statoresidenza: "stato di residenza ospite",
  luogoresidenza: "luogo di residenza ospite",
  residenza: "residenza ospite",
  provenienza: "provenienza ospite",
  tipoturismo: "tipo turismo",
  mezzotrasporto: "mezzo di trasporto",
  idcapo: "capogruppo",
  datapartenza: "data di partenza",
};

/** Scarica un Blob lato browser dato il contenuto e il nome file. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Decodifica una stringa base64 (binario ZIP) in byte (buffer dedicato → valido come BlobPart). */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Bottone di export del tracciato regionale di UNA struttura (canale FILE: Norma prepara il file,
 * l'host lo carica al portale). Dispatcha sul `serializerId`: Ross1000/SPOT → un XML; Turismatica
 * C/59 (Umbria) → uno ZIP coi file giornalieri. Se il report è incompleto mostra i dati mancanti
 * (mai si genera con dati inventati).
 */
export function RegionFileExportButton({
  propertyId,
  period,
  serializerId,
  system,
}: {
  propertyId: string;
  period: string;
  serializerId: RegionSerializerId;
  system: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);

  const isZip = serializerId === "turismatica-c59";
  const label = isZip ? "Scarica ZIP (file giornalieri)" : "Scarica XML";

  function onClick() {
    setError(null);
    setMissing(null);
    start(async () => {
      if (serializerId === "turismatica-c59") {
        const res = await exportUmbriaC59Action(propertyId, period);
        if (res.ok) {
          downloadBlob(
            new Blob([base64ToBytes(res.base64)], { type: "application/zip" }),
            res.filename,
          );
          return;
        }
        setError(res.error);
        if (res.missing)
          setMissing([...new Set(res.missing.map((m) => FIELD_LABELS[m.field] ?? m.field))]);
        return;
      }

      const action = serializerId === "spot-xml" ? exportSpotXmlAction : exportRoss1000XmlAction;
      const res = await action(propertyId, period);
      if (res.ok) {
        downloadBlob(
          new Blob([res.content], { type: "application/xml;charset=utf-8" }),
          res.filename,
        );
        return;
      }
      setError(res.error);
      if (res.missing)
        setMissing([...new Set(res.missing.map((m) => FIELD_LABELS[m.field] ?? m.field))]);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {label}
      </Button>
      <span className="text-muted-foreground max-w-[16rem] text-right text-[11px]">
        Portale {system}: scarichi il file e lo carichi tu.
      </span>
      {error && (
        <span className="text-destructive max-w-xs text-right text-xs" role="alert">
          {error}
          {missing && missing.length > 0 ? ` Mancano: ${missing.join(", ")}.` : ""}
        </span>
      )}
    </div>
  );
}

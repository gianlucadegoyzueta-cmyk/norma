"use client";

import { useState, useTransition } from "react";
import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  changeDeclarationStatusAction,
  prepareDeclarationPdfAction,
  prepareRemittanceAction,
  setRemittanceModeAction,
} from "./actions";

const MODE_LABELS: Record<TaxRemittanceMode, string> = {
  MANUAL_EXPORT: "Esporta e invio io",
  GECOS: "GECOS (assistito)",
  PAGOPA: "pagoPA (assistito)",
  COMUNE_PORTAL: "Portale comunale (assistito)",
};

// Transizioni offerte all'utente per ogni stato (rispecchiano la macchina a stati del dominio).
const NEXT: Record<TaxDeclarationStatus, Array<{ to: TaxDeclarationStatus; label: string }>> = {
  DRAFT: [{ to: "READY", label: "Segna come pronta" }],
  READY: [
    { to: "SUBMITTED", label: "Segna come inviata" },
    { to: "DRAFT", label: "Riapri" },
  ],
  SUBMITTED: [{ to: "PAID", label: "Segna come pagata" }],
  PAID: [],
  CANCELLED: [],
};

export function DeclarationActions({
  id,
  status,
  remittanceMode,
}: {
  id: string;
  status: TaxDeclarationStatus;
  remittanceMode: TaxRemittanceMode;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function download(filename: string, mimeType: string, content: string) {
    triggerDownload(new Blob([content], { type: mimeType }), filename);
  }

  function downloadBase64(filename: string, base64: string, mimeType: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    triggerDownload(new Blob([bytes], { type: mimeType }), filename);
  }

  function onExport() {
    setMsg(null);
    start(async () => {
      const res = await prepareRemittanceAction(id);
      if (!res.ok) return setMsg(res.error);
      const r = res.result;
      if (r.kind === "EXPORT_READY") download(r.filename, r.mimeType, r.content);
      else if (r.kind === "REDIRECT") window.open(r.url, "_blank", "noopener");
      else setMsg(r.message); // NOT_IMPLEMENTED → spiega che si usa l'export manuale
    });
  }

  function onExportPdf() {
    setMsg(null);
    start(async () => {
      const res = await prepareDeclarationPdfAction(id);
      if (!res.ok) return setMsg(res.error);
      downloadBase64(res.filename, res.base64, "application/pdf");
    });
  }

  function onMode(mode: TaxRemittanceMode) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("mode", mode);
    start(async () => {
      await setRemittanceModeAction(fd);
    });
  }

  function onStatus(to: TaxDeclarationStatus) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("to", to);
    setMsg(null);
    start(async () => {
      const res = await changeDeclarationStatusAction(fd);
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Modalità di versamento"
          value={remittanceMode}
          onChange={(e) => onMode(e.target.value as TaxRemittanceMode)}
          disabled={pending}
          className="h-9 w-56"
        >
          {(Object.keys(MODE_LABELS) as TaxRemittanceMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={onExport} disabled={pending}>
          Esporta CSV
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onExportPdf} disabled={pending}>
          Esporta PDF
        </Button>
        {NEXT[status].map((t) => (
          <Button
            key={t.to}
            type="button"
            size="sm"
            variant={t.to === "DRAFT" ? "ghost" : "default"}
            onClick={() => onStatus(t.to)}
            disabled={pending}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {msg && (
        <p className="text-muted-foreground text-xs" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

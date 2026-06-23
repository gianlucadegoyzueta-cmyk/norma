"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  // Transizione in attesa di conferma esplicita: cambiare stato (es. "pagata"/"inviata") è
  // quasi-irreversibile, quindi passa da una micro-conferma inline prima di persistere.
  const [confirm, setConfirm] = useState<{ to: TaxDeclarationStatus; label: string } | null>(null);

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
    setOk(null);
    start(async () => {
      const res = await prepareRemittanceAction(id);
      if (!res.ok) return setMsg(res.error);
      const r = res.result;
      if (r.kind === "EXPORT_READY") {
        download(r.filename, r.mimeType, r.content);
        setOk(`Scaricato ${r.filename}.`);
      } else if (r.kind === "REDIRECT") {
        const w = window.open(r.url, "_blank", "noopener");
        if (w === null) {
          setMsg("Il browser ha bloccato la finestra: abilita i popup o usa Esporta CSV.");
        }
      } else setMsg(r.message); // NOT_IMPLEMENTED → spiega che si usa l'export manuale
    });
  }

  function onExportPdf() {
    setMsg(null);
    setOk(null);
    start(async () => {
      const res = await prepareDeclarationPdfAction(id);
      if (!res.ok) return setMsg(res.error);
      downloadBase64(res.filename, res.base64, "application/pdf");
      setOk(`Scaricato ${res.filename}.`);
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

  function onStatus(to: TaxDeclarationStatus, label: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("to", to);
    setMsg(null);
    setOk(null);
    start(async () => {
      const res = await changeDeclarationStatusAction(fd);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setConfirm(null);
      setOk(`Fatto: “${label}”.`);
      router.refresh();
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
            // "Riapri" (→DRAFT) è reversibile: va diretto. Le transizioni in avanti
            // (pronta/inviata/pagata) passano da una conferma esplicita.
            onClick={() =>
              t.to === "DRAFT" ? onStatus(t.to, t.label) : setConfirm({ to: t.to, label: t.label })
            }
            disabled={pending}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {confirm && (
        <div className="border-border grid gap-2 rounded-md border p-3">
          <p className="text-muted-foreground text-xs">
            {confirm.to === "PAID"
              ? "Confermi il versamento? Questo chiude il ciclo della dichiarazione."
              : confirm.to === "SUBMITTED"
                ? "Confermi di aver inviato la dichiarazione all’ente?"
                : `Confermi: “${confirm.label}”?`}{" "}
            Lo stato lo aggiorni tu: Norma non invia né paga al posto tuo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onStatus(confirm.to, confirm.label)}
              disabled={pending}
            >
              {pending ? "Aggiorno…" : confirm.label}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirm(null)}
              disabled={pending}
            >
              Annulla
            </Button>
          </div>
        </div>
      )}

      {ok && (
        <p className="text-success text-xs" role="status">
          {ok}
        </p>
      )}
      {msg && (
        <p className="text-muted-foreground text-xs" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

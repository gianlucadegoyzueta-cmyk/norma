"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDataAction } from "./actions";

/** Decodifica base64 → Uint8Array (lato browser, per scaricare lo zip generato server-side). */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Bottone "Esporta i tuoi dati": scarica un unico zip con i propri CSV. */
export function ExportDataButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const res = await exportDataAction();
      if (!res.ok) return setError(res.message);
      const blob = new Blob([base64ToBytes(res.base64).buffer as ArrayBuffer], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={pending}
        className="w-fit"
      >
        <Download className="size-4" aria-hidden />
        {pending ? "Preparo l'export…" : "Esporta i tuoi dati"}
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportIstatCsvAction } from "./actions";

/** Scarica il CSV del report ISTAT del mese corrente (lato client, da contenuto generato server-side). */
export function IstatExportButton({ period, disabled }: { period: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const res = await exportIstatCsvAction(period);
      if (!res.ok) return setError(res.error);
      const blob = new Blob([res.content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={disabled || pending}
      >
        Esporta CSV
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

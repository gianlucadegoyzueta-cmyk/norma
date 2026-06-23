"use client";

import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import { SupportChat } from "@/app/support/SupportChat";

/**
 * Bolla di assistenza AI flottante, presente su tutto il sito e nell'app (montata nel root layout).
 * Riusa <SupportChat />: stessa pipeline /api/support/chat (risponde dalla KB o escala a un umano).
 * Posizione rialzata su mobile per non coprire la bottom-bar dell'app.
 */
export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistenza Norma"
          className="fixed right-4 bottom-36 z-50 flex h-[520px] max-h-[72dvh] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:right-6 sm:bottom-24"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Assistenza</p>
              <p className="text-xs text-gray-500">
                Domande su Alloggiati e ISTAT · in dubbio, una persona
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi assistenza"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden px-4 py-3">
            <SupportChat />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chiudi assistenza" : "Apri assistenza"}
        aria-expanded={open}
        className="fixed right-4 bottom-20 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-gray-800 sm:right-6 sm:bottom-6"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
      </button>
    </>
  );
}

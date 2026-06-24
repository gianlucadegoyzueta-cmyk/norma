import type { Metadata } from "next";
import { SupportChat } from "./SupportChat";

export const metadata: Metadata = {
  title: "Assistenza — Norma",
  description: "Fai una domanda sull'uso di Norma, su Alloggiati o sul movimento turistico.",
};

export default function SupportPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Assistenza Norma</h1>
        <p className="text-muted-foreground text-sm">
          Domande su Alloggiati, movimento turistico ISTAT/Ross1000 o su come si usa Norma. Quando
          non è certo, ti mettiamo in contatto con una persona.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            Risposta immediata
          </span>
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            Passo a un umano se incerto
          </span>
        </div>
      </header>
      <SupportChat />
    </main>
  );
}

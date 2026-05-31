import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pagina non trovata" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Brand />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pagina non trovata</h1>
        <p className="text-muted-foreground mx-auto max-w-prose text-sm">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
      </div>
      <Link href="/dashboard">
        <Button>Torna alla dashboard</Button>
      </Link>
    </main>
  );
}

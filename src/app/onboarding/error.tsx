"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Brand />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Configurazione interrotta</h1>
        <p className="text-muted-foreground mx-auto max-w-prose text-sm">
          Non siamo riusciti a caricare la configurazione. Riprova: i tuoi progressi sono salvati.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Riprova</Button>
        <Link href="/dashboard">
          <Button variant="outline">Vai alla dashboard</Button>
        </Link>
      </div>
    </main>
  );
}

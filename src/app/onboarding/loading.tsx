import { Brand } from "@/components/brand";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="border-border flex items-center border-b px-4 py-3 sm:px-6">
        <Brand />
      </header>
      <div className="flex flex-1 items-center justify-center" aria-busy>
        <Spinner className="size-6" label="Carico la configurazione…" />
      </div>
    </main>
  );
}

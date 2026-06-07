import { Brand } from "@/components/brand";
import { Spinner } from "@/components/ui/spinner";

/** Loading PUBBLICO (volto al cliente): niente chrome dell'app, solo marchio + spinner. */
export default function Loading() {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <Brand />
      <Spinner className="text-primary size-6" />
    </div>
  );
}

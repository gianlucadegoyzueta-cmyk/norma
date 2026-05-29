import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
        <ShieldCheck className="size-5" />
      </span>
      <span>
        Compliance
        <span className="text-muted-foreground ml-1">· Affitti Brevi</span>
      </span>
    </span>
  );
}

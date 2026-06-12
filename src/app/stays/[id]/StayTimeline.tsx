import {
  CalendarPlus,
  CheckCircle2,
  Coins,
  DownloadCloud,
  FileCheck2,
  FileText,
  Send,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReservationSource } from "@prisma/client";
import { formatEuroCents } from "@/server/modules/tourist-tax/services/estimate.service";
import type { StayTimelineEvent, StayTimelineKind } from "@/server/modules/stays/domain/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Timestamp in stile concierge: data + ora, fuso Italia.
const tsFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

const SOURCE_LABEL: Record<ReservationSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING: "Booking",
  VRBO: "Vrbo",
  OTHER: "calendario esterno",
};

const ICON: Record<StayTimelineKind, LucideIcon> = {
  created: CalendarPlus,
  imported: DownloadCloud,
  checkin: UserCheck,
  schedina_prepared: FileText,
  schedina_sent: Send,
  schedina_acquired: FileCheck2,
  tax_counted: Coins,
  tax_submitted: CheckCircle2,
};

/** Testo dell'evento. Le azioni di Norma vengono etichettate "Norma:" dal chiamante. */
function label(e: StayTimelineEvent): string {
  switch (e.kind) {
    case "created":
      return "Soggiorno creato";
    case "imported":
      return `Importato da ${SOURCE_LABEL[e.source ?? "OTHER"]}`;
    case "checkin":
      return "L'ospite ha completato il check-in online";
    case "schedina_prepared":
      return `Schedine preparate (${e.count})`;
    case "schedina_sent":
      return `Schedine inviate ad Alloggiati (${e.count})`;
    case "schedina_acquired":
      return e.receiptRef
        ? `Acquisite dalla Questura (${e.count}) · ricevuta ${e.receiptRef}`
        : `Acquisite dalla Questura (${e.count})`;
    case "tax_counted":
      return `Imposta di soggiorno conteggiata · ${formatEuroCents(e.amountCents ?? 0)} (${e.periodLabel})`;
    case "tax_submitted":
      return `Imposta dichiarata al comune · ${e.periodLabel}`;
  }
}

/**
 * Storia verticale del soggiorno: nodi salvia, timestamp mono, "Norma:" sulle azioni sue.
 * Riceve eventi già ordinati e calcolati a monte (solo dati reali).
 */
export function StayTimeline({ events }: { events: StayTimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storia del soggiorno</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative grid gap-5">
          {events.map((e, i) => {
            const Icon = ICON[e.kind];
            const isLast = i === events.length - 1;
            return (
              <li key={`${e.kind}-${i}`} className="relative flex gap-3">
                {/* Linea verticale che connette i nodi */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="bg-border absolute top-7 left-[13px] h-[calc(100%+0.25rem)] w-px"
                  />
                )}
                <span className="bg-secondary text-secondary-foreground ring-background relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="grid gap-0.5 pt-0.5">
                  <p className="text-sm text-pretty">
                    {e.byNorma && <span className="text-foreground font-medium">Norma: </span>}
                    {label(e)}
                  </p>
                  <time className="text-muted-foreground font-mono text-xs">
                    {tsFmt.format(e.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

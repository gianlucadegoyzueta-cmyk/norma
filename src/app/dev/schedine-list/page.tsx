import { notFound } from "next/navigation";
import type { SchedinaStatus } from "@prisma/client";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { SchedineList } from "@/app/schedine/schedine-list";

// Anteprima NON di produzione della lista densa Schedine (tutti gli stati). 404 in produzione.
// I bottoni di ri-apertura sono client + server action: qui si vedono ma non si attivano (no auth).
export const dynamic = "force-dynamic";

const now = new Date("2026-06-13T12:00:00+02:00").getTime();
const d = (iso: string) => new Date(iso);

type Row = {
  id: string;
  status: SchedinaStatus;
  guestName: string;
  propertyName: string;
  credentialLabel: string;
  deadlineAt: Date;
  lastErrorCod: string | null;
  lastErrorDes: string | null;
};

const MOCK: Row[] = [
  {
    id: "1",
    status: "PENDING",
    guestName: "Léa Dubois",
    propertyName: "Villa Vista",
    credentialLabel: "Questura Como · WSKey RM-034",
    deadlineAt: d("2026-06-12T10:00:00+02:00"),
    lastErrorCod: null,
    lastErrorDes: null,
  },
  {
    id: "2",
    status: "PENDING",
    guestName: "Marco Bianchi",
    propertyName: "Lago Suite",
    credentialLabel: "Questura Como · WSKey RM-034",
    deadlineAt: d("2026-06-14T18:00:00+02:00"),
    lastErrorCod: null,
    lastErrorDes: null,
  },
  {
    id: "3",
    status: "ACQUIRED",
    guestName: "Yuki Tanaka",
    propertyName: "Borgo 7",
    credentialLabel: "Questura Como · WSKey RM-034",
    deadlineAt: d("2026-06-11T09:00:00+02:00"),
    lastErrorCod: null,
    lastErrorDes: null,
  },
  {
    id: "4",
    status: "REJECTED",
    guestName: "Claire Dubois",
    propertyName: "Attico Duomo",
    credentialLabel: "Questura Milano · WSKey MI-012",
    deadlineAt: d("2026-06-12T09:00:00+02:00"),
    lastErrorCod: "INVALID_DOC",
    lastErrorDes: "Numero documento non valido",
  },
  {
    id: "5",
    status: "UNVERIFIED",
    guestName: "James O'Connor",
    propertyName: "Lago Suite",
    credentialLabel: "Questura Como · WSKey RM-034",
    deadlineAt: d("2026-06-13T20:00:00+02:00"),
    lastErrorCod: null,
    lastErrorDes: null,
  },
  {
    id: "6",
    status: "NEEDS_REVIEW",
    guestName: "Anna Novák",
    propertyName: "Villa Vista",
    credentialLabel: "Questura Como · WSKey RM-034",
    deadlineAt: d("2026-06-13T08:00:00+02:00"),
    lastErrorCod: null,
    lastErrorDes: null,
  },
];

const STAY_IDS = new Map([
  ["4", "stay-attico"],
  ["6", "stay-villa"],
]);

const GUEST_IDS = new Map([
  ["4", "guest-rossi"],
  ["6", "guest-muller"],
]);

export default function SchedineListPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ConciergePage
      dense
      active="schedine"
      kicker="OUTBOX · ALLOGGIATI WEB"
      title="Schedine"
      intro="Anteprima dev della lista densa con tutti gli stati."
    >
      <section className="cmx-section" style={{ marginTop: 0 }}>
        <SchedineList
          schedine={MOCK}
          stayIdBySchedina={STAY_IDS}
          guestIdBySchedina={GUEST_IDS}
          now={now}
        />
      </section>
    </ConciergePage>
  );
}

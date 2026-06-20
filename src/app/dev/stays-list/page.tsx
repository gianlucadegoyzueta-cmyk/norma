import { notFound } from "next/navigation";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { StaysList } from "@/app/stays/stays-list";

// Anteprima NON di produzione della lista densa Soggiorni con dati mock. 404 in produzione.
export const dynamic = "force-dynamic";

const MOCK = [
  {
    id: "1",
    propertyName: "Villa Vista",
    comuneName: "Como",
    provincia: "CO",
    arrivalDate: new Date("2026-06-13"),
    departureDate: new Date("2026-06-15"),
    isShortStay: false,
    guestsCount: 2,
    guestsAdded: 2,
    schedine: { total: 2, acquired: 2, pending: 0, sending: 0, rejected: 0, unverified: 0 },
  },
  {
    id: "2",
    propertyName: "Lago Suite",
    comuneName: "Bellagio",
    provincia: "CO",
    arrivalDate: new Date("2026-06-13"),
    departureDate: new Date("2026-06-17"),
    isShortStay: false,
    guestsCount: 4,
    guestsAdded: 3,
    schedine: { total: 3, acquired: 0, pending: 3, sending: 0, rejected: 0, unverified: 0 },
  },
  {
    id: "3",
    propertyName: "Borgo 7",
    comuneName: "Menaggio",
    provincia: "CO",
    arrivalDate: new Date("2026-06-12"),
    departureDate: null,
    isShortStay: true,
    guestsCount: 1,
    guestsAdded: 1,
    schedine: { total: 1, acquired: 0, pending: 0, sending: 0, rejected: 1, unverified: 0 },
  },
  {
    id: "4",
    propertyName: "Attico Duomo",
    comuneName: "Milano",
    provincia: "MI",
    arrivalDate: new Date("2026-06-11"),
    departureDate: new Date("2026-06-14"),
    isShortStay: false,
    guestsCount: 2,
    guestsAdded: 0,
    schedine: { total: 0, acquired: 0, pending: 0, sending: 0, rejected: 0, unverified: 0 },
  },
];

export default function StaysListPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ConciergePage
      dense
      active="stays"
      kicker="REGISTRO · SOGGIORNI"
      title="Soggiorni"
      intro="Anteprima dev della lista densa con dati di esempio."
    >
      <section className="cmx-section" style={{ marginTop: 0 }}>
        <h2 className="cmx-section-title">I tuoi soggiorni</h2>
        <StaysList stays={MOCK} />
      </section>
    </ConciergePage>
  );
}

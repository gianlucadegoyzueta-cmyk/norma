import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db";
import {
  DEFAULT_LOCALE,
  isLocale,
  LANG_NAMES,
  type Locale,
  LOCALES,
  MESSAGES,
} from "@/server/modules/checkin/messages";
import { resolveCheckinToken } from "@/server/modules/checkin/token";
import { CheckinForm } from "./CheckinForm";

export const metadata: Metadata = { title: "Check-in", robots: { index: false } };
export const dynamic = "force-dynamic";

function LangSwitcher({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Lingua">
      {LOCALES.map((l) => (
        <a
          key={l}
          href={`?lang=${l}`}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            l === active
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {LANG_NAMES[l]}
        </a>
      ))}
    </nav>
  );
}

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const m = MESSAGES[locale];

  const ctx = await resolveCheckinToken(token);

  return (
    // lang sul sottoalbero: screen reader, sillabazione e correttore usano la lingua scelta dall'ospite.
    <div lang={locale} className="bg-background relative min-h-dvh">
      {/* Grana di carta appena percettibile, coerente con la superficie auth (theme-safe). */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.5] mix-blend-multiply"
      >
        <filter id="checkin-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.13 0 0 0 0 0.11 0 0 0 0 0.08 0 0 0 0.04 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#checkin-grain)" />
      </svg>
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Brand />
          <LangSwitcher active={locale} />
        </div>

        {!ctx ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {m.invalidTitle}
              </h1>
              <p className="text-muted-foreground max-w-sm text-sm text-pretty">{m.invalidBody}</p>
            </CardContent>
          </Card>
        ) : (
          <CheckinContent token={token} locale={locale} m={m} />
        )}
      </div>
    </div>
  );
}

async function CheckinContent({
  token,
  locale,
  m,
}: {
  token: string;
  locale: Locale;
  m: (typeof MESSAGES)[keyof typeof MESSAGES];
}) {
  const [countries, comuniRows, documentTypes] = await Promise.all([
    prisma.country.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.comune.findMany({
      select: { id: true, name: true, provincia: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentType.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const comuni = comuniRows.map((c) => ({ id: c.id, label: `${c.name} (${c.provincia})` }));
  const luoghi = [...comuni, ...countries.map((c) => ({ id: c.id, label: c.name }))];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">{m.intro}</p>
      </div>
      <CheckinForm
        token={token}
        locale={locale}
        m={m}
        countries={countries}
        comuni={comuni}
        luoghi={luoghi}
        documentTypes={documentTypes}
      />
      <p className="text-muted-foreground text-xs text-pretty">{m.privacy}</p>
    </div>
  );
}

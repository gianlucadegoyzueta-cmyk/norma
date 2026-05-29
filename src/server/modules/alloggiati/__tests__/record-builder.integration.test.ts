import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaReferenceTablesLoader } from "../adapters/PrismaReferenceTablesLoader";
import { PrismaSchedinaRepository } from "../adapters/PrismaSchedinaRepository";
import { FIELD_LAYOUT } from "../domain/tracciato";
import { SchedinaRecordBuilder } from "../services/record-builder.service";
import { PrismaStaysRepository } from "../../stays/adapters/PrismaStaysRepository";
import type { Party } from "../../stays/domain/parties";
import { StaysService } from "../../stays/services/stays.service";

// Test di INTEGRAZIONE (DB reale): pipeline soggiorno + ospiti → schedine PENDING → payloadSnapshot.
// Le tabelle di riferimento sono popolate con DATI DI ESEMPIO (NON dal web service).
const runDb = process.env.RUN_DB_TESTS === "1";

function slice(record: string, field: { start: number; len: number }): string {
  return record.slice(field.start, field.start + field.len);
}

describe.skipIf(!runDb)("SchedinaRecordBuilder — integrazione (DB reale)", () => {
  let prisma: PrismaClient;
  let staysService: StaysService;
  let builder: SchedinaRecordBuilder;
  let repo: PrismaSchedinaRepository;

  const s = Date.now().toString();
  // Codici di esempio alle larghezze ufficiali (Comune 9, Stato 9, Documento 5), unici per run.
  const comuneCode = `5${s.slice(-8)}`;
  const countryCode = `1${s.slice(-8)}`;
  const docTypeCode = `D${s.slice(-4)}`;
  const ids = {
    org: `rb_org_${s}`,
    comune: `rb_com_${s}`,
    country: `rb_ctry_${s}`,
    docType: `rb_doc_${s}`,
    cred: `rb_cred_${s}`,
    prop: `rb_prop_${s}`,
  };

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    prisma = new PrismaClient({ datasourceUrl: url });

    repo = new PrismaSchedinaRepository(prisma);
    const loader = new PrismaReferenceTablesLoader(prisma);
    // "now" iniettato = 01/06/2026 così l'arrivo del fixture (01/06) è dentro la finestra di invio.
    staysService = new StaysService(new PrismaStaysRepository(prisma), repo, loader, {
      now: () => new Date("2026-06-01T12:00:00Z"),
    });
    builder = new SchedinaRecordBuilder(prisma, loader);

    // Tabelle di riferimento (dati di esempio).
    await prisma.comune.create({
      data: { id: ids.comune, code: comuneCode, name: "ROMA", provincia: "RM" },
    });
    await prisma.country.create({ data: { id: ids.country, code: countryCode, name: "ITALIA" } });
    await prisma.documentType.create({
      data: { id: ids.docType, code: docTypeCode, name: "CARTA IDENTITA' ELETTRONICA" },
    });

    await prisma.organization.create({ data: { id: ids.org, name: "RB Org" } });
    await prisma.alloggiatiCredential.create({
      data: {
        id: ids.cred,
        organizationId: ids.org,
        label: "RB",
        category: "SINGOLA",
        provincia: "RM",
        secretRef: `rb_ref_${s}`,
      },
    });
    await prisma.property.create({
      data: {
        id: ids.prop,
        organizationId: ids.org,
        name: "RB Prop",
        address: "Via Y 2",
        comuneId: ids.comune,
        proprietario: "Tizio",
        credentialId: ids.cred,
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.organization.delete({ where: { id: ids.org } }).catch(() => undefined);
    await prisma.comune.delete({ where: { id: ids.comune } }).catch(() => undefined);
    await prisma.country.delete({ where: { id: ids.country } }).catch(() => undefined);
    await prisma.documentType.delete({ where: { id: ids.docType } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("da soggiorno + ospite → schedina PENDING con la riga di 168 caratteri nel payloadSnapshot", async () => {
    const { id: stayId } = await staysService.createStay({
      organizationId: ids.org,
      propertyId: ids.prop,
      arrivalDate: new Date("2026-06-01T15:00:00Z"),
      departureDate: new Date("2026-06-04T10:00:00Z"),
      guestsCount: 1,
      isShortStay: false,
    });

    const ospite: Party = {
      tipo: "SINGOLO",
      ospite: {
        firstName: "Mario",
        lastName: "Rossi",
        sex: "M",
        birthDate: new Date("1990-05-20T00:00:00Z"),
        birthCountryId: ids.country,
        citizenshipId: ids.country,
        birthComuneId: ids.comune,
        documentTypeId: ids.docType,
        documentNumber: "AB1234567",
        documentPlaceId: ids.comune,
      },
    };
    await staysService.addGuests(stayId, ids.org, [ospite]);

    const { schedinaIds, created } = await staysService.generateSchedine(stayId);
    expect(created).toBe(1);

    const schedinaId = schedinaIds[0];

    // RecordBuilder reale: risolve i codici dal DB e serializza il tracciato.
    const record = await builder.build(schedinaId);
    expect(record).toHaveLength(168);
    expect(slice(record, FIELD_LAYOUT.tipoAlloggiato)).toBe("16"); // OSPITE_SINGOLO
    expect(slice(record, FIELD_LAYOUT.dataArrivo)).toBe("01/06/2026");
    expect(slice(record, FIELD_LAYOUT.giorniPermanenza)).toBe("03"); // 1→4 giugno
    expect(slice(record, FIELD_LAYOUT.comuneNascita)).toBe(comuneCode);
    expect(slice(record, FIELD_LAYOUT.statoNascita)).toBe(countryCode);
    expect(slice(record, FIELD_LAYOUT.tipoDocumento)).toBe(docTypeCode);
    expect(slice(record, FIELD_LAYOUT.luogoRilascioDocumento)).toBe(comuneCode);

    // Persistenza dello snapshot (la schedina resta PENDING).
    await repo.setPayloadSnapshot(schedinaId, record);
    const persisted = await prisma.schedina.findUniqueOrThrow({ where: { id: schedinaId } });
    expect(persisted.status).toBe("PENDING");
    expect(persisted.payloadSnapshot).toBe(record);
  });
});

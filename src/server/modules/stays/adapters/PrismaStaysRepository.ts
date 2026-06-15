import type { PrismaClient, SchedinaStatus, TipoAlloggiato } from "@prisma/client";
import { type GuestData, type Party, tipiPerParty } from "../domain/parties";
import type {
  CreateStayInput,
  SchedinaStatusCounts,
  StayDetail,
  StayForGeneration,
  StayListItem,
  StaysRepository,
} from "../ports";

/** Riepilogo vuoto, da incrementare per stato. */
function emptyCounts(): SchedinaStatusCounts {
  return { total: 0, pending: 0, sending: 0, acquired: 0, rejected: 0, unverified: 0 };
}

function tallySchedine(statuses: (SchedinaStatus | null | undefined)[]): SchedinaStatusCounts {
  const c = emptyCounts();
  for (const s of statuses) {
    if (!s) continue;
    c.total += 1;
    if (s === "PENDING") c.pending += 1;
    else if (s === "SENDING") c.sending += 1;
    else if (s === "ACQUIRED") c.acquired += 1;
    else if (s === "REJECTED") c.rejected += 1;
    else if (s === "UNVERIFIED") c.unverified += 1;
  }
  return c;
}

export class PrismaStaysRepository implements StaysRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createStay(input: CreateStayInput): Promise<{ id: string }> {
    return this.prisma.stay.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        guestsCount: input.guestsCount,
        isShortStay: input.isShortStay,
      },
      select: { id: true },
    });
  }

  async addGuests(
    stayId: string,
    organizationId: string,
    parties: Party[],
  ): Promise<{ guestIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const guestIds: string[] = [];
      const create = async (
        data: GuestData,
        tipo: TipoAlloggiato,
        leaderId: string | null,
      ): Promise<string> => {
        const g = await tx.guest.create({
          data: {
            organizationId,
            stayId,
            tipoAlloggiato: tipo,
            leaderId,
            firstName: data.firstName,
            lastName: data.lastName,
            sex: data.sex,
            birthDate: data.birthDate,
            birthCountryId: data.birthCountryId,
            birthComuneId: data.birthComuneId ?? null,
            citizenshipId: data.citizenshipId,
            residenceCountryId: data.residenceCountryId ?? null,
            residenceComuneId: data.residenceComuneId ?? null,
            residenceForeignLocality: data.residenceForeignLocality ?? null,
            tourismType: data.tourismType ?? null,
            transportMeans: data.transportMeans ?? null,
            documentTypeId: data.documentTypeId ?? null,
            documentNumber: data.documentNumber ?? null,
            documentPlaceId: data.documentPlaceId ?? null,
          },
          select: { id: true },
        });
        guestIds.push(g.id);
        return g.id;
      };
      for (const party of parties) {
        const tipi = tipiPerParty(party.tipo);
        if (party.tipo === "SINGOLO") {
          await create(party.ospite, tipi.capo, null);
        } else {
          const capoId = await create(party.capo, tipi.capo, null);
          for (const membro of party.membri)
            await create(membro, tipi.membro as TipoAlloggiato, capoId);
        }
      }
      return { guestIds };
    });
  }

  async loadForGeneration(stayId: string): Promise<StayForGeneration | null> {
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        guests: true,
        property: { select: { credentialId: true, alloggiatiApartmentId: true } },
      },
    });
    if (!stay) return null;
    return {
      organizationId: stay.organizationId,
      credentialId: stay.property.credentialId,
      alloggiatiApartmentId: stay.property.alloggiatiApartmentId,
      stay: {
        arrivalDate: stay.arrivalDate,
        departureDate: stay.departureDate,
        isShortStay: stay.isShortStay,
      },
      guests: stay.guests, // Guest[] è assegnabile a (ResolverGuest & { id })[]
    };
  }

  async listByOrganization(organizationId: string): Promise<StayListItem[]> {
    const stays = await this.prisma.stay.findMany({
      where: { organizationId },
      orderBy: { arrivalDate: "desc" },
      select: {
        id: true,
        arrivalDate: true,
        departureDate: true,
        isShortStay: true,
        guestsCount: true,
        property: {
          select: {
            name: true,
            credentialId: true,
            comune: { select: { name: true, provincia: true } },
          },
        },
        // Le schedine sono legate all'ospite; per il riepilogo prendiamo lo stato di ciascuna.
        guests: { select: { schedina: { select: { status: true } } } },
      },
    });

    return stays.map((s) => ({
      id: s.id,
      propertyName: s.property.name,
      comuneName: s.property.comune.name,
      provincia: s.property.comune.provincia,
      hasCredential: s.property.credentialId !== null,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
      isShortStay: s.isShortStay,
      guestsCount: s.guestsCount,
      guestsAdded: s.guests.length,
      schedine: tallySchedine(s.guests.map((g) => g.schedina?.status)),
    }));
  }

  async getStayDetail(stayId: string, organizationId: string): Promise<StayDetail | null> {
    const stay = await this.prisma.stay.findFirst({
      // organizationId nel where = isolamento: un id di un'altra org non viene trovato.
      where: { id: stayId, organizationId },
      select: {
        id: true,
        organizationId: true,
        arrivalDate: true,
        departureDate: true,
        isShortStay: true,
        guestsCount: true,
        property: {
          select: {
            name: true,
            credentialId: true,
            comune: { select: { name: true, provincia: true } },
          },
        },
        guests: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tipoAlloggiato: true,
            leaderId: true,
            documentNumber: true,
            schedina: { select: { status: true } },
          },
        },
      },
    });
    if (!stay) return null;
    return {
      id: stay.id,
      organizationId: stay.organizationId,
      propertyName: stay.property.name,
      comuneName: stay.property.comune.name,
      provincia: stay.property.comune.provincia,
      hasCredential: stay.property.credentialId !== null,
      arrivalDate: stay.arrivalDate,
      departureDate: stay.departureDate,
      isShortStay: stay.isShortStay,
      guestsCount: stay.guestsCount,
      guests: stay.guests.map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        tipoAlloggiato: g.tipoAlloggiato,
        leaderId: g.leaderId,
        hasDocument: g.documentNumber !== null,
        schedinaStatus: g.schedina?.status ?? null,
      })),
    };
  }
}

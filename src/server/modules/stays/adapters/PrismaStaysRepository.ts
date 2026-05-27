import type { PrismaClient, TipoAlloggiato } from "@prisma/client";
import { type GuestData, type Party, tipiPerParty } from "../domain/parties";
import type { CreateStayInput, StayForGeneration, StaysRepository } from "../ports";

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

  async addGuests(stayId: string, organizationId: string, parties: Party[]): Promise<{ guestIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const guestIds: string[] = [];
      const create = async (data: GuestData, tipo: TipoAlloggiato, leaderId: string | null): Promise<string> => {
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
          for (const membro of party.membri) await create(membro, tipi.membro as TipoAlloggiato, capoId);
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
}

import type { TipoAlloggiato } from "@prisma/client";
import type { ResolverGuest } from "../../alloggiati";
import { type GuestData, type Party, tipiPerParty } from "../domain/parties";
import type { CreateStayInput, StayForGeneration, StaysRepository } from "../ports";

type GuestRow = ResolverGuest & { id: string; stayId: string };
type StayRow = CreateStayInput & { id: string };
type PropertyInfo = { credentialId: string | null; alloggiatiApartmentId: string | null };

/** Normalizza GuestData (campi opzionali `undefined`) in un ResolverGuest (valori `null`). */
function toResolverGuest(data: GuestData, tipo: TipoAlloggiato): ResolverGuest {
  return {
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
    tipoAlloggiato: tipo,
  };
}

/** Repository soggiorni/ospiti IN MEMORIA per i test (niente DB). */
export class InMemoryStaysRepository implements StaysRepository {
  private readonly stays = new Map<string, StayRow>();
  private readonly guests = new Map<string, GuestRow>();
  private readonly properties = new Map<string, PropertyInfo>();
  private seq = 0;

  /** Helper per i test: registra le info Alloggiati dell'immobile. */
  setProperty(id: string, info: PropertyInfo): void {
    this.properties.set(id, info);
  }

  async createStay(input: CreateStayInput): Promise<{ id: string }> {
    const id = `stay_${++this.seq}`;
    this.stays.set(id, { id, ...input });
    return { id };
  }

  async addGuests(
    stayId: string,
    _organizationId: string,
    parties: Party[],
  ): Promise<{ guestIds: string[] }> {
    const guestIds: string[] = [];
    const create = (data: GuestData, tipo: TipoAlloggiato): void => {
      const id = `guest_${++this.seq}`;
      this.guests.set(id, { ...toResolverGuest(data, tipo), id, stayId });
      guestIds.push(id);
    };
    for (const party of parties) {
      const tipi = tipiPerParty(party.tipo);
      if (party.tipo === "SINGOLO") {
        create(party.ospite, tipi.capo);
      } else {
        create(party.capo, tipi.capo);
        for (const membro of party.membri) create(membro, tipi.membro as TipoAlloggiato);
      }
    }
    return { guestIds };
  }

  async loadForGeneration(stayId: string): Promise<StayForGeneration | null> {
    const stay = this.stays.get(stayId);
    if (!stay) return null;
    const property = this.properties.get(stay.propertyId) ?? {
      credentialId: null,
      alloggiatiApartmentId: null,
    };
    const guests = [...this.guests.values()].filter((g) => g.stayId === stayId);
    return {
      organizationId: stay.organizationId,
      credentialId: property.credentialId,
      alloggiatiApartmentId: property.alloggiatiApartmentId,
      stay: {
        arrivalDate: stay.arrivalDate,
        departureDate: stay.departureDate,
        isShortStay: stay.isShortStay,
      },
      guests,
    };
  }
}

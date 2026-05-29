import type { TipoAlloggiato } from "@prisma/client";
import type { ResolverGuest } from "../../alloggiati";
import { type GuestData, type Party, tipiPerParty } from "../domain/parties";
import type {
  CreateStayInput,
  StayDetail,
  StayForGeneration,
  StayListItem,
  StaysRepository,
} from "../ports";

type GuestRow = ResolverGuest & { id: string; stayId: string };
type StayRow = CreateStayInput & { id: string };
type PropertyInfo = {
  credentialId: string | null;
  alloggiatiApartmentId: string | null;
  name?: string;
  comuneName?: string;
  provincia?: string;
};

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

  async listByOrganization(organizationId: string): Promise<StayListItem[]> {
    // Riepilogo schedine non tracciato in memoria (non c'è l'outbox qui): conteggi a zero.
    return [...this.stays.values()]
      .filter((s) => s.organizationId === organizationId)
      .sort((a, b) => b.arrivalDate.getTime() - a.arrivalDate.getTime())
      .map((s) => {
        const property = this.properties.get(s.propertyId);
        const guestsAdded = [...this.guests.values()].filter((g) => g.stayId === s.id).length;
        return {
          id: s.id,
          propertyName: property?.name ?? s.propertyId,
          comuneName: property?.comuneName ?? "",
          provincia: property?.provincia ?? "",
          hasCredential: (property?.credentialId ?? null) !== null,
          arrivalDate: s.arrivalDate,
          departureDate: s.departureDate,
          isShortStay: s.isShortStay,
          guestsCount: s.guestsCount,
          guestsAdded,
          schedine: { total: 0, pending: 0, sending: 0, acquired: 0, rejected: 0, unverified: 0 },
        };
      });
  }

  async getStayDetail(stayId: string, organizationId: string): Promise<StayDetail | null> {
    const stay = this.stays.get(stayId);
    if (!stay || stay.organizationId !== organizationId) return null;
    const property = this.properties.get(stay.propertyId);
    const guests = [...this.guests.values()]
      .filter((g) => g.stayId === stayId)
      .map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        tipoAlloggiato: g.tipoAlloggiato,
        leaderId: null, // l'InMemory non traccia la relazione capo→membro
        hasDocument: (g.documentNumber ?? null) !== null,
        schedinaStatus: null,
      }));
    return {
      id: stay.id,
      organizationId: stay.organizationId,
      propertyName: property?.name ?? stay.propertyId,
      comuneName: property?.comuneName ?? "",
      provincia: property?.provincia ?? "",
      hasCredential: (property?.credentialId ?? null) !== null,
      arrivalDate: stay.arrivalDate,
      departureDate: stay.departureDate,
      isShortStay: stay.isShortStay,
      guestsCount: stay.guestsCount,
      guests,
    };
  }
}

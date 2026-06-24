import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  CreatePropertyInput,
  PropertyComune,
  PropertyListItem,
  PropertyRepository,
  UpdateRoss1000ConfigInput,
} from "../ports";

const SELECT = {
  id: true,
  name: true,
  address: true,
  proprietario: true,
  alloggiatiApartmentId: true,
  comune: { select: { id: true, name: true, provincia: true } },
  credential: { select: { id: true, label: true } },
} satisfies Prisma.PropertySelect;

export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePropertyInput): Promise<{ id: string }> {
    return this.prisma.property.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        address: input.address,
        comuneId: input.comuneId,
        proprietario: input.proprietario,
        credentialId: input.credentialId,
      },
      select: { id: true },
    });
  }

  async listByOrganization(organizationId: string): Promise<PropertyListItem[]> {
    const rows = await this.prisma.property.findMany({
      where: { organizationId },
      select: SELECT,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      proprietario: r.proprietario,
      comune: r.comune,
      credential: r.credential,
      alloggiatiApartmentId: r.alloggiatiApartmentId,
    }));
  }

  async updateRoss1000Config(input: UpdateRoss1000ConfigInput): Promise<{ updated: boolean }> {
    // updateMany scoped per organizationId: isolamento by query (un immobile di un'altra org → count 0).
    const res = await this.prisma.property.updateMany({
      where: { id: input.propertyId, organizationId: input.organizationId },
      data: {
        ross1000Code: input.ross1000Code,
        camereDisponibili: input.camereDisponibili,
        lettiDisponibili: input.lettiDisponibili,
      },
    });
    return { updated: res.count > 0 };
  }

  async getComuneProvincia(comuneId: string): Promise<string | null> {
    const c = await this.prisma.comune.findUnique({
      where: { id: comuneId },
      select: { provincia: true },
    });
    return c?.provincia ?? null;
  }

  /**
   * Comuni selezionabili nel form, ristretti alle province date (quelle delle credenziali
   * dell'org): un sottoinsieme piccolo e sicuro da passare al client, non tutti i Comuni d'Italia.
   * Non fa parte del PORT: è una lettura di supporto alla UI.
   */
  async listSelectableComuni(province: readonly string[]): Promise<PropertyComune[]> {
    if (province.length === 0) return [];
    return this.prisma.comune.findMany({
      where: { provincia: { in: [...province] } },
      select: { id: true, name: true, provincia: true },
      orderBy: [{ provincia: "asc" }, { name: "asc" }],
    });
  }
}

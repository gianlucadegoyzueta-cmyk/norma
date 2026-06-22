// Servizio della DICHIARAZIONE periodica: aggrega i soggiorni di un periodo per
// organizzazione + comune, calcola l'imposta dovuta (calcolatore puro), crea/aggiorna la
// dichiarazione con righe di dettaglio. Gestisce le transizioni di stato (validate).

import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { computeTouristTax } from "../domain/calculator";
import { assertValidDeclarationTransition, isDeclarationRecomputable } from "../domain/declaration";
import { periodBounds } from "../domain/period";
import { computeNormaFee } from "../domain/take-rate";
import { resolveTakeRateBps } from "../domain/take-rate-config";
import type { TouristTaxConfigRepository } from "../ports/TouristTaxConfigRepository";
import type {
  DeclarationLineInput,
  DeclarationPatch,
  DeclarationRecord,
  TouristTaxDeclarationRepository,
} from "../ports/TouristTaxDeclarationRepository";

export interface BuildDeclarationInput {
  organizationId: string;
  comuneId: string;
  period: string; // "2026-05" | "2026-Q2" | "2026"
}

export type BuildDeclarationOutcome =
  | { kind: "OK"; declaration: DeclarationRecord; staysCount: number; skippedNoRule: number }
  | { kind: "NO_RULE"; comuneId: string }
  | { kind: "LOCKED"; status: TaxDeclarationStatus };

export class TouristTaxDeclarationService {
  constructor(
    private readonly declarations: TouristTaxDeclarationRepository,
    private readonly configs: TouristTaxConfigRepository,
  ) {}

  /**
   * Costruisce/ricalcola la dichiarazione del periodo. Per ogni soggiorno risolve la regola
   * valida alla DATA DI ARRIVO e calcola l'imposta. Idempotente (sostituisce le righe).
   * Bloccato se la dichiarazione non è più ricalcolabile (SUBMITTED/PAID).
   */
  async buildOrRecompute(input: BuildDeclarationInput): Promise<BuildDeclarationOutcome> {
    const existing = await this.findExisting(input);
    if (existing && !isDeclarationRecomputable(existing.status)) {
      return { kind: "LOCKED", status: existing.status };
    }

    const { start, end } = periodBounds(input.period);
    const stays = await this.declarations.findStaysInPeriod(
      input.organizationId,
      input.comuneId,
      start,
      end,
    );

    const lines: DeclarationLineInput[] = [];
    let total = 0;
    let skippedNoRule = 0;
    // Override take-rate del comune: lo prendiamo dalla regola applicata (stabile per versione).
    let comuneTakeRateBps: number | null = null;

    for (const s of stays) {
      const rule = await this.configs.findRuleForDate(s.comuneId, s.arrivalDate);
      if (!rule) {
        skippedNoRule += 1;
        continue; // soggiorno senza regola: NON incluso (mai importi inventati)
      }
      if (rule.normaTakeRateBps !== undefined) comuneTakeRateBps = rule.normaTakeRateBps;
      const result = computeTouristTax(
        {
          arrivalDate: s.arrivalDate,
          departureDate: s.departureDate,
          accommodationCategory: s.accommodationCategory ?? undefined,
          zone: s.touristTaxZone ?? undefined,
        },
        s.guests.map((g) => ({
          id: g.id,
          birthDate: g.birthDate,
          exemptionType: g.taxExemptionType,
        })),
        rule,
      );
      total += result.totalCents;
      lines.push({
        stayId: s.stayId,
        propertyName: s.propertyName,
        taxedNights: result.guests.reduce((max, g) => Math.max(max, g.taxedNights), 0),
        amountCents: result.totalCents,
        breakdown: result.guests,
      });
    }

    if (stays.length > 0 && lines.length === 0 && skippedNoRule === stays.length) {
      return { kind: "NO_RULE", comuneId: input.comuneId };
    }

    // Commissione Norma sul LORDO totale. Precedenza: comune → default org → 0 (nessuna commissione).
    // Snapshot congelato sulla dichiarazione: nessun denaro reale è movimentato (gate del founder).
    const orgDefaultBps = await this.configs.getOrgTakeRateBps(input.organizationId);
    const takeRate = resolveTakeRateBps({ comuneBps: comuneTakeRateBps, orgDefaultBps });
    const fee = computeNormaFee(total, takeRate.bps);

    const declaration = await this.declarations.upsertDeclarationWithLines({
      organizationId: input.organizationId,
      comuneId: input.comuneId,
      period: input.period,
      amountCents: total,
      normaTakeRateBps: fee.takeRateBps,
      normaFeeCents: fee.normaFeeCents,
      comuneNetCents: fee.comuneNetCents,
      lines,
    });
    return { kind: "OK", declaration, staysCount: stays.length, skippedNoRule };
  }

  /** Transizione di stato validata (DRAFT→READY→SUBMITTED→PAID, annullabile prima dell'invio). */
  async changeStatus(
    id: string,
    organizationId: string,
    to: TaxDeclarationStatus,
  ): Promise<DeclarationRecord> {
    const decl = await this.declarations.getDeclaration(id, organizationId);
    if (!decl) throw new Error("Dichiarazione non trovata");
    assertValidDeclarationTransition(decl.status, to);
    const patch: DeclarationPatch = { status: to };
    if (to === "SUBMITTED") patch.submittedAt = new Date();
    if (to === "PAID") patch.paidAt = new Date();
    await this.declarations.updateDeclaration(id, organizationId, patch);
    return { ...decl, status: to };
  }

  /** Imposta la modalità di versamento scelta dall'utente (non cambia lo stato). */
  async setRemittanceMode(
    id: string,
    organizationId: string,
    mode: TaxRemittanceMode,
  ): Promise<void> {
    await this.declarations.updateDeclaration(id, organizationId, { remittanceMode: mode });
  }

  private async findExisting(input: BuildDeclarationInput): Promise<DeclarationRecord | null> {
    const all = await this.declarations.listDeclarations(input.organizationId);
    return all.find((d) => d.comuneId === input.comuneId && d.period === input.period) ?? null;
  }
}

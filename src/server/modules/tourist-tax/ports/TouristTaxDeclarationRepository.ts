// PORT: lettura dei soggiorni di un periodo e persistenza delle dichiarazioni.
// Il servizio non conosce Prisma.

import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import type { GuestTaxBreakdown } from "../domain/calculator";

/** Soggiorno (coi dati necessari al calcolo) che ricade nel periodo. */
export interface StayInPeriod {
  stayId: string;
  propertyName: string;
  comuneId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  accommodationCategory: string | null;
  touristTaxZone: string | null;
  guests: Array<{ id: string; birthDate: Date; taxExemptionType: string | null }>;
}

export interface DeclarationLineInput {
  stayId: string;
  propertyName: string;
  taxedNights: number;
  amountCents: number;
  breakdown: GuestTaxBreakdown[];
}

export interface UpsertDeclarationInput {
  organizationId: string;
  comuneId: string;
  period: string;
  amountCents: number;
  /** Snapshot commissione Norma. Invariante: normaFeeCents + comuneNetCents == amountCents. */
  normaTakeRateBps: number;
  normaFeeCents: number;
  comuneNetCents: number;
  lines: DeclarationLineInput[];
}

export interface DeclarationRecord {
  id: string;
  organizationId: string;
  comuneId: string;
  period: string;
  amountCents: number;
  /** Snapshot commissione Norma (take-rate) congelato al calcolo. */
  normaTakeRateBps: number;
  normaFeeCents: number;
  comuneNetCents: number;
  status: TaxDeclarationStatus;
  remittanceMode: TaxRemittanceMode;
}

export interface DeclarationLineRecord {
  stayId: string;
  propertyName: string;
  taxedNights: number;
  amountCents: number;
}

export interface DeclarationPatch {
  status?: TaxDeclarationStatus;
  remittanceMode?: TaxRemittanceMode;
  submittedAt?: Date | null;
  paidAt?: Date | null;
  /**
   * Snapshot commissione. I tre campi vanno SEMPRE insieme (o nessuno): se uno è presente,
   * l'adapter pretende anche gli altri due e verifica l'invariante fee + netto == lordo.
   * Oggi nessun chiamante li passa, ma il guardrail rende l'estensione futura sicura by default.
   */
  amountCents?: number;
  normaFeeCents?: number;
  comuneNetCents?: number;
}

export interface TouristTaxDeclarationRepository {
  /** Soggiorni dell'org per un comune con arrivo in [start, end). Isolamento multi-tenant. */
  findStaysInPeriod(
    organizationId: string,
    comuneId: string,
    start: Date,
    end: Date,
  ): Promise<StayInPeriod[]>;
  /** Crea/aggiorna IDEMPOTENTE la dichiarazione (org+comune+periodo) sostituendo le righe. */
  upsertDeclarationWithLines(input: UpsertDeclarationInput): Promise<DeclarationRecord>;
  listDeclarations(organizationId: string): Promise<DeclarationRecord[]>;
  getDeclaration(id: string, organizationId: string): Promise<DeclarationRecord | null>;
  getDeclarationLines(id: string, organizationId: string): Promise<DeclarationLineRecord[]>;
  /** Aggiorna stato e/o modalità di versamento (transizione già validata dal servizio). */
  updateDeclaration(id: string, organizationId: string, patch: DeclarationPatch): Promise<void>;
}

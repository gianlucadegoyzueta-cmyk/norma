-- Take-rate (commissione Norma) sulla tassa di soggiorno.
-- Additiva e non distruttiva: tutte le colonne sono nullable o con DEFAULT → safe su tabelle esistenti.
-- ⚠️ Solo SCAFFOLDING di calcolo/registrazione: nessun incasso reale (gate del founder).

-- Default take-rate per organizzazione (punti base; null = nessun default → 0%).
ALTER TABLE "Organization" ADD COLUMN     "normaTakeRateBps" INTEGER;

-- Snapshot della ripartizione, congelato al calcolo della dichiarazione.
-- Invariante applicativa: normaFeeCents + comuneNetCents = amountCents.
ALTER TABLE "TouristTaxDeclaration" ADD COLUMN     "comuneNetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "normaFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "normaTakeRateBps" INTEGER NOT NULL DEFAULT 0;

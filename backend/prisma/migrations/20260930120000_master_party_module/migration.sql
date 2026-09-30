-- Master Module: Customer / Supplier type flags on FinanceParty (parties)

ALTER TABLE "FinanceParty" ADD COLUMN IF NOT EXISTS "isCustomer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FinanceParty" ADD COLUMN IF NOT EXISTS "isSupplier" BOOLEAN NOT NULL DEFAULT true;

UPDATE "FinanceParty" SET "isCustomer" = true, "isSupplier" = true;

-- Deduplicate names before unique constraint (keep earliest created)
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY "createdAt" ASC) AS rn
  FROM "FinanceParty"
)
UPDATE "FinanceParty" p
SET name = p.name || ' (' || SUBSTRING(p.id, 1, 6) || ')'
FROM dups
WHERE p.id = dups.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceParty_name_key" ON "FinanceParty"("name");
CREATE INDEX IF NOT EXISTS "FinanceParty_isActive_isCustomer_idx" ON "FinanceParty"("isActive", "isCustomer");
CREATE INDEX IF NOT EXISTS "FinanceParty_isActive_isSupplier_idx" ON "FinanceParty"("isActive", "isSupplier");

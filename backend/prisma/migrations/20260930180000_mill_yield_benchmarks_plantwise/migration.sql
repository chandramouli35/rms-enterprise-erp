-- Mill Yield Benchmarks → mill-wise (per plant)
-- Prefer: node scripts/migrate-mill-yield-plantwise.js

ALTER TABLE "MillYieldBenchmark" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
DROP INDEX IF EXISTS "MillYieldBenchmark_itemKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_itemKey_key" ON "MillYieldBenchmark"("plantId", "itemKey");
CREATE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_idx" ON "MillYieldBenchmark"("plantId");

-- Mill Yield Benchmarks → mill-wise (per plant)
-- Prefer: node scripts/migrate-mill-yield-plantwise.js
-- plantId stays NULLABLE so prisma db push does not warn about data reset.
-- Application still requires plantId on create/list.

ALTER TABLE "MillYieldBenchmark" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "MillYieldBenchmark" ALTER COLUMN "plantId" DROP NOT NULL;
DROP INDEX IF EXISTS "MillYieldBenchmark_itemKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_itemKey_key" ON "MillYieldBenchmark"("plantId", "itemKey");
CREATE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_idx" ON "MillYieldBenchmark"("plantId");

-- Artia-wise A Class / B Class bag weights (moved off plant-only config)
ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "aClassBagWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.380;
ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "bClassBagWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.385;

-- Seed from the mill when the Artia is linked to a plant
UPDATE "Supplier" s
SET
  "aClassBagWeight" = COALESCE(p."aClassBagWeight", 0.380),
  "bClassBagWeight" = COALESCE(p."bClassBagWeight", 0.385)
FROM "Plant" p
WHERE s."plantId" = p.id;

-- Stack & Paddy Integration: Weight Segment + RST on Hoodi transfers
ALTER TABLE "HoodiRecord" ADD COLUMN IF NOT EXISTS "netWeight" DOUBLE PRECISION;
ALTER TABLE "HoodiRecord" ADD COLUMN IF NOT EXISTS "rstNo" TEXT;
ALTER TABLE "HoodiRecord" ADD COLUMN IF NOT EXISTS "biometricData" TEXT;

-- Dryer Bharai to Stack receipts
CREATE TABLE IF NOT EXISTS "DryerBharaiToStack" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stackNo" TEXT NOT NULL,
    "bags" DOUBLE PRECISION NOT NULL,
    "moisture" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "rstNo" TEXT,
    "biometricData" TEXT,
    "verifiedById" TEXT,
    "unloadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DryerBharaiToStack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DryerBharaiToStack_plantId_stackNo_idx" ON "DryerBharaiToStack"("plantId", "stackNo");
CREATE INDEX IF NOT EXISTS "DryerBharaiToStack_plantId_date_idx" ON "DryerBharaiToStack"("plantId", "date");

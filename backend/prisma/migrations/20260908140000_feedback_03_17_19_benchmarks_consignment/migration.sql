-- Feedback 03: Mill Yield Benchmarks
CREATE TABLE IF NOT EXISTS "MillYieldBenchmark" (
    "id" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "requiredQty" DOUBLE PRECISION,
    "yieldPctPaddy" DOUBLE PRECISION NOT NULL,
    "yieldPctRice" DOUBLE PRECISION NOT NULL,
    "roundFigRicePct" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MillYieldBenchmark_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MillYieldBenchmark_itemKey_key" ON "MillYieldBenchmark"("itemKey");

-- Feedback 19: Consignment Dispatch
CREATE TABLE IF NOT EXISTS "ConsignmentDispatch" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isNilDay" BOOLEAN NOT NULL DEFAULT false,
    "gatePassId" TEXT,
    "fciGpNo" TEXT,
    "consignmentNo" TEXT,
    "mainBags" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageBags" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fciMoisture" DOUBLE PRECISION,
    "fciDamage" DOUBLE PRECISION,
    "fciDiscolour" DOUBLE PRECISION,
    "fciBroken" DOUBLE PRECISION,
    "fciDepoWeight" DOUBLE PRECISION,
    "fciPortalWeight" DOUBLE PRECISION,
    "netWeightMill" DOUBLE PRECISION,
    "biometricData" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "fromTransferTicket" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsignmentDispatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsignmentDispatch_plantId_date_idx" ON "ConsignmentDispatch"("plantId", "date");
CREATE INDEX IF NOT EXISTS "ConsignmentDispatch_consignmentNo_idx" ON "ConsignmentDispatch"("consignmentNo");
CREATE INDEX IF NOT EXISTS "ConsignmentDispatch_gatePassId_idx" ON "ConsignmentDispatch"("gatePassId");
ALTER TABLE "ConsignmentDispatch" ADD CONSTRAINT "ConsignmentDispatch_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsignmentDispatch" ADD CONSTRAINT "ConsignmentDispatch_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "GatePass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feedback 17: Paddy Usage weekly record
CREATE TABLE IF NOT EXISTS "PaddyUsageRecord" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "openingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockInHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paddyDispatched" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paddyInHoodi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paddyInDryer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paddyInSilos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biometricData" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaddyUsageRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaddyUsageRecord_plantId_weekStart_key" ON "PaddyUsageRecord"("plantId", "weekStart");
CREATE INDEX IF NOT EXISTS "PaddyUsageRecord_plantId_idx" ON "PaddyUsageRecord"("plantId");
ALTER TABLE "PaddyUsageRecord" ADD CONSTRAINT "PaddyUsageRecord_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Feedback 03 benchmarks (upsert-friendly via ON CONFLICT)
INSERT INTO "MillYieldBenchmark" ("id","itemKey","itemLabel","requiredQty","yieldPctPaddy","yieldPctRice","roundFigRicePct","sortOrder","isActive","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text, 'PADDY', 'Paddy', 95817, 100, 0, 0, 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NET_RICE', 'Net rice', 63430.854, 66.2, 100, 100, 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'KANI', 'kani / Broken Rice', 2874.51, 3, 4.531722054, 4.53, 3, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NAKKU', 'nakku', 766.536, 0.8, 1.208459215, 1.2, 4, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'REJECTION', 'Rejection', 958.17, 1, 1.510574018, 1.5, 5, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'BRAN', 'Bran / R. Bran', 8144.445, 8.5, 12.83987915, 12.8, 6, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'K_PHUCK', 'K.Phuck', 2395.425, 2.5, 3.776435045, 3.7, 7, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'HUSK', 'Husk', 15809.805, 16.5, 24.9244713, 24.92, 8, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'PURCHASED_RICE', 'Purchased Rice', 3832.68, 4, 6.042296073, 6, 9, true, NOW(), NOW())
ON CONFLICT ("itemKey") DO NOTHING;

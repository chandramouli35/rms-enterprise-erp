-- Feedback 53 — Labour Work Order
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "labourPartyId" TEXT;

ALTER TABLE "FinanceLedgerEntry" ADD COLUMN IF NOT EXISTS "labourPartyId" TEXT;

CREATE TABLE IF NOT EXISTS "LabourWorkItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "unitLabel" TEXT NOT NULL DEFAULT 'bag',
  "ratesManualOnly" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabourWorkItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabourWorkItem_name_key" ON "LabourWorkItem"("name");

CREATE TABLE IF NOT EXISTS "LabourWorkTask" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'OTHER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabourWorkTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabourWorkTask_itemId_name_key" ON "LabourWorkTask"("itemId", "name");
CREATE INDEX IF NOT EXISTS "LabourWorkTask_itemId_idx" ON "LabourWorkTask"("itemId");

CREATE TABLE IF NOT EXISTS "LabourWorkRate" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "labourPartyId" TEXT NOT NULL DEFAULT '',
  "taskId" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabourWorkRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabourWorkRate_plantId_labourPartyId_taskId_key" ON "LabourWorkRate"("plantId", "labourPartyId", "taskId");
CREATE INDEX IF NOT EXISTS "LabourWorkRate_plantId_idx" ON "LabourWorkRate"("plantId");

CREATE TABLE IF NOT EXISTS "LabourWorkOrder" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "workOrderNo" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "labourPartyId" TEXT,
  "source" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "gatePassId" TEXT,
  "inwardId" TEXT,
  "itemId" TEXT,
  "itemName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "fingerprintName" TEXT,
  "affectsStock" BOOLEAN NOT NULL DEFAULT false,
  "sourceRef" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabourWorkOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabourWorkOrder_plantId_workOrderNo_key" ON "LabourWorkOrder"("plantId", "workOrderNo");
CREATE UNIQUE INDEX IF NOT EXISTS "LabourWorkOrder_sourceRef_key" ON "LabourWorkOrder"("sourceRef");
CREATE INDEX IF NOT EXISTS "LabourWorkOrder_plantId_date_idx" ON "LabourWorkOrder"("plantId", "date");
CREATE INDEX IF NOT EXISTS "LabourWorkOrder_labourPartyId_idx" ON "LabourWorkOrder"("labourPartyId");

CREATE TABLE IF NOT EXISTS "LabourWorkOrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "taskId" TEXT,
  "taskName" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabourWorkOrderLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LabourWorkOrderLine_orderId_idx" ON "LabourWorkOrderLine"("orderId");

DO $$ BEGIN
  ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_labourPartyId_fkey" FOREIGN KEY ("labourPartyId") REFERENCES "LabourMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_labourPartyId_fkey" FOREIGN KEY ("labourPartyId") REFERENCES "LabourMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkTask" ADD CONSTRAINT "LabourWorkTask_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LabourWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkRate" ADD CONSTRAINT "LabourWorkRate_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkRate" ADD CONSTRAINT "LabourWorkRate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LabourWorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrder" ADD CONSTRAINT "LabourWorkOrder_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrder" ADD CONSTRAINT "LabourWorkOrder_labourPartyId_fkey" FOREIGN KEY ("labourPartyId") REFERENCES "LabourMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrder" ADD CONSTRAINT "LabourWorkOrder_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "GatePass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrder" ADD CONSTRAINT "LabourWorkOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LabourWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrderLine" ADD CONSTRAINT "LabourWorkOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabourWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabourWorkOrderLine" ADD CONSTRAINT "LabourWorkOrderLine_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LabourWorkTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_labourPartyId_date_idx" ON "FinanceLedgerEntry"("labourPartyId", "date");
CREATE INDEX IF NOT EXISTS "GatePass_labourPartyId_idx" ON "GatePass"("labourPartyId");

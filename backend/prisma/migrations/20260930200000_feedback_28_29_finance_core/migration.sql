-- Feedback 28/29 Finance core tables (idempotent for environments that used db push)

CREATE TABLE IF NOT EXISTS "FinanceParty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firmName" TEXT,
    "contact" TEXT,
    "notes" TEXT,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceParty_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceParty_name_key" ON "FinanceParty"("name");
ALTER TABLE "FinanceParty" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "FinanceSoda" (
    "id" TEXT NOT NULL,
    "sodaType" TEXT NOT NULL,
    "sodaNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "partyId" TEXT,
    "partyPlantId" TEXT,
    "rate" DOUBLE PRECISION,
    "isShift" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_CLEAR',
    "paymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mirrorSodaId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceSoda_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSoda_sodaType_sodaNumber_key" ON "FinanceSoda"("sodaType", "sodaNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSoda_mirrorSodaId_key" ON "FinanceSoda"("mirrorSodaId");
CREATE INDEX IF NOT EXISTS "FinanceSoda_sodaType_idx" ON "FinanceSoda"("sodaType");
CREATE INDEX IF NOT EXISTS "FinanceSoda_date_idx" ON "FinanceSoda"("date");
CREATE INDEX IF NOT EXISTS "FinanceSoda_itemId_idx" ON "FinanceSoda"("itemId");

CREATE TABLE IF NOT EXISTS "FinanceSodaMill" (
    "id" TEXT NOT NULL,
    "sodaId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    CONSTRAINT "FinanceSodaMill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSodaMill_sodaId_plantId_key" ON "FinanceSodaMill"("sodaId", "plantId");
CREATE INDEX IF NOT EXISTS "FinanceSodaMill_plantId_idx" ON "FinanceSodaMill"("plantId");

ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "financeSodaId" TEXT;
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "financeSodaNA" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "billNo" TEXT;
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "billNoNA" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "bagTypeGp" TEXT;
CREATE INDEX IF NOT EXISTS "GatePass_financeSodaId_idx" ON "GatePass"("financeSodaId");

CREATE TABLE IF NOT EXISTS "FinanceSalePurchaseLine" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "financeSodaId" TEXT NOT NULL,
    "gatePassId" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL,
    "bagWeightConsideration" BOOLEAN NOT NULL DEFAULT false,
    "oilResult" DOUBLE PRECISION,
    "cdPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceSalePurchaseLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSalePurchaseLine_gatePassId_key" ON "FinanceSalePurchaseLine"("gatePassId");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSalePurchaseLine_financeSodaId_serialNo_key" ON "FinanceSalePurchaseLine"("financeSodaId", "serialNo");
CREATE INDEX IF NOT EXISTS "FinanceSalePurchaseLine_plantId_reportType_idx" ON "FinanceSalePurchaseLine"("plantId", "reportType");
CREATE INDEX IF NOT EXISTS "FinanceSalePurchaseLine_financeSodaId_idx" ON "FinanceSalePurchaseLine"("financeSodaId");

CREATE TABLE IF NOT EXISTS "FinancePaymentStatusAudit" (
    "id" TEXT NOT NULL,
    "financeSodaId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePaymentStatusAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinancePaymentStatusAudit_financeSodaId_idx" ON "FinancePaymentStatusAudit"("financeSodaId");

CREATE TABLE IF NOT EXISTS "FinanceLedgerEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "entryType" TEXT NOT NULL,
    "partyId" TEXT,
    "partyPlantId" TEXT,
    "financeSodaId" TEXT,
    "salePurchaseLineId" TEXT,
    "plantId" TEXT,
    "narration" TEXT,
    "notes" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceLedgerEntry_salePurchaseLineId_key" ON "FinanceLedgerEntry"("salePurchaseLineId");
CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_partyId_date_idx" ON "FinanceLedgerEntry"("partyId", "date");
CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_partyPlantId_date_idx" ON "FinanceLedgerEntry"("partyPlantId", "date");
CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_entryType_idx" ON "FinanceLedgerEntry"("entryType");
CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_financeSodaId_idx" ON "FinanceLedgerEntry"("financeSodaId");
CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_date_idx" ON "FinanceLedgerEntry"("date");

-- FKs (ignore if already present)
DO $$ BEGIN
  ALTER TABLE "FinanceSoda" ADD CONSTRAINT "FinanceSoda_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSoda" ADD CONSTRAINT "FinanceSoda_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "FinanceParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSoda" ADD CONSTRAINT "FinanceSoda_partyPlantId_fkey" FOREIGN KEY ("partyPlantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSoda" ADD CONSTRAINT "FinanceSoda_mirrorSodaId_fkey" FOREIGN KEY ("mirrorSodaId") REFERENCES "FinanceSoda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSodaMill" ADD CONSTRAINT "FinanceSodaMill_sodaId_fkey" FOREIGN KEY ("sodaId") REFERENCES "FinanceSoda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSodaMill" ADD CONSTRAINT "FinanceSodaMill_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_financeSodaId_fkey" FOREIGN KEY ("financeSodaId") REFERENCES "FinanceSoda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSalePurchaseLine" ADD CONSTRAINT "FinanceSalePurchaseLine_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSalePurchaseLine" ADD CONSTRAINT "FinanceSalePurchaseLine_financeSodaId_fkey" FOREIGN KEY ("financeSodaId") REFERENCES "FinanceSoda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceSalePurchaseLine" ADD CONSTRAINT "FinanceSalePurchaseLine_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "GatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinancePaymentStatusAudit" ADD CONSTRAINT "FinancePaymentStatusAudit_financeSodaId_fkey" FOREIGN KEY ("financeSodaId") REFERENCES "FinanceSoda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "FinanceParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_partyPlantId_fkey" FOREIGN KEY ("partyPlantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_financeSodaId_fkey" FOREIGN KEY ("financeSodaId") REFERENCES "FinanceSoda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_salePurchaseLineId_fkey" FOREIGN KEY ("salePurchaseLineId") REFERENCES "FinanceSalePurchaseLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

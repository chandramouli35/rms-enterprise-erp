-- Feedback 48: manual / direct Agency GP entries
CREATE TABLE IF NOT EXISTS "ManualAgencyGp" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "agencyGp" TEXT NOT NULL,
    "truckNo" TEXT NOT NULL,
    "arthiaId" TEXT,
    "arthiaName" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "mandi" TEXT NOT NULL,
    "bagsClass" TEXT NOT NULL,
    "bags" DOUBLE PRECISION NOT NULL,
    "isDirect" BOOLEAN NOT NULL DEFAULT true,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "biometricData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualAgencyGp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ManualAgencyGp_agencyGp_key" ON "ManualAgencyGp"("agencyGp");
CREATE INDEX IF NOT EXISTS "ManualAgencyGp_plantId_date_idx" ON "ManualAgencyGp"("plantId", "date");

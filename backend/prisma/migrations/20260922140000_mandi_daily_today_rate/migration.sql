-- Admin Mandi Daily Rate (Today Rate + M/C Point) + snapshots on estimate/boli
CREATE TABLE IF NOT EXISTS "MandiDailyRate" (
  "id" TEXT NOT NULL,
  "plantId" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "mandi" TEXT NOT NULL,
  "todayRate" DOUBLE PRECISION NOT NULL,
  "mcPoint" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MandiDailyRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MandiDailyRate_plantId_date_mandi_key"
  ON "MandiDailyRate"("plantId", "date", "mandi");
CREATE INDEX IF NOT EXISTS "MandiDailyRate_plantId_date_idx"
  ON "MandiDailyRate"("plantId", "date");
CREATE INDEX IF NOT EXISTS "MandiDailyRate_mandi_idx"
  ON "MandiDailyRate"("mandi");

DO $$ BEGIN
  ALTER TABLE "MandiDailyRate"
    ADD CONSTRAINT "MandiDailyRate_plantId_fkey"
    FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "PaddySodaPending" ADD COLUMN IF NOT EXISTS "todayRate" DOUBLE PRECISION;
ALTER TABLE "PaddySodaPending" ADD COLUMN IF NOT EXISTS "mcPoint" DOUBLE PRECISION;
ALTER TABLE "PaddyBoli" ADD COLUMN IF NOT EXISTS "todayRate" DOUBLE PRECISION;

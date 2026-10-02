-- Feedback 47: Stack↔Hoodi / Dryer Bharai weight + real-time date settings

ALTER TABLE "Plant"
  ADD COLUMN IF NOT EXISTS "allowManualDateTimeStackTransfer" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "HoodiRecord"
  ADD COLUMN IF NOT EXISTS "grossWeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "tareWeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "truckNo" TEXT;

-- truckNo may already exist on HoodiRecord — ignore if duplicate add fails via IF NOT EXISTS above for new cols only
ALTER TABLE "DryerBharaiToStack"
  ADD COLUMN IF NOT EXISTS "grossWeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "tareWeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "truckNo" TEXT;

-- Feedback 49: e-GP Late + 3rd part stack + boli restore payload
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "thirdPartStackNo" TEXT;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "bagsInThirdPartStack" DOUBLE PRECISION;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "thirdPartIsHoodi" BOOLEAN DEFAULT false;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "thirdPartUnloadWeight" DOUBLE PRECISION;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "thirdPartUnloaderName" TEXT;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "thirdPartUnloaderTruckCount" DOUBLE PRECISION;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "egpLate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "boliBagsApplied" JSONB;

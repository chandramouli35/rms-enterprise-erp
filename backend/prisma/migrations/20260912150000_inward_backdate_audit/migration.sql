ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "entryMadeByName" TEXT;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "entryMadeByUserId" TEXT;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "isBackdated" BOOLEAN DEFAULT false;

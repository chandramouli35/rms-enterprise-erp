-- Feedback 39 — Hold option on Paddy Inward Unloading Management
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "isHold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "holdReason" TEXT;
ALTER TABLE "PaddyInwardDetails" ADD COLUMN IF NOT EXISTS "heldAt" TIMESTAMP(3);

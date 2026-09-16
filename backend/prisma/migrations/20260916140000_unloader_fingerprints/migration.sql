-- Feedback 33 — fingerprint required for Unloader staff registration
ALTER TABLE "StaffMaster" ADD COLUMN IF NOT EXISTS "fingerprint1" TEXT;
ALTER TABLE "StaffMaster" ADD COLUMN IF NOT EXISTS "fingerprint2" TEXT;

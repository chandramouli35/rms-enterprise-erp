-- Arthiya (Supplier): supervisor fingerprint + admin approval
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "biometricData" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
CREATE INDEX IF NOT EXISTS "Supplier_status_idx" ON "Supplier"("status");

-- Feedback 50: loose paddy bags (stack count only)
CREATE TABLE IF NOT EXISTS "LoosePaddyBag" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "entryDate" TEXT NOT NULL,
  "bags" INTEGER NOT NULL,
  "bagClass" TEXT NOT NULL,
  "stackNo" TEXT NOT NULL,
  "unloaderName" TEXT NOT NULL,
  "submittedById" TEXT,
  "submittedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoosePaddyBag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoosePaddyBag_plantId_entryDate_idx" ON "LoosePaddyBag"("plantId", "entryDate");
CREATE INDEX IF NOT EXISTS "LoosePaddyBag_plantId_stackNo_idx" ON "LoosePaddyBag"("plantId", "stackNo");

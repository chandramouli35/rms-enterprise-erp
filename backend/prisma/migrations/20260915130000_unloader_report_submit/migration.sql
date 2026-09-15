-- Feedback 39 — per-unloader daily report submission (Admin)
CREATE TABLE IF NOT EXISTS "DailyUnloaderReportSnapshot" (
  "id" TEXT NOT NULL,
  "reportDate" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "unloaderName" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "unloaderSignedBy" TEXT,
  "supervisorSignedBy" TEXT,
  "unloaderBiometricOk" BOOLEAN NOT NULL DEFAULT false,
  "supervisorBiometricOk" BOOLEAN NOT NULL DEFAULT false,
  "submittedBy" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyUnloaderReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyUnloaderReportSnapshot_reportDate_plantId_unloaderName_key"
  ON "DailyUnloaderReportSnapshot"("reportDate", "plantId", "unloaderName");

CREATE INDEX IF NOT EXISTS "DailyUnloaderReportSnapshot_reportDate_plantId_idx"
  ON "DailyUnloaderReportSnapshot"("reportDate", "plantId");

-- Split mill-wide allowManualDateTime into Paddy Inward / Gate In / Gate Out flags
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "allowManualDateTimePaddyInward" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "allowManualDateTimeGateIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "allowManualDateTimeGateOut" BOOLEAN NOT NULL DEFAULT false;

-- Copy legacy flag into all three when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Plant' AND column_name = 'allowManualDateTime'
  ) THEN
    UPDATE "Plant"
    SET
      "allowManualDateTimePaddyInward" = "allowManualDateTime",
      "allowManualDateTimeGateIn" = "allowManualDateTime",
      "allowManualDateTimeGateOut" = "allowManualDateTime";
    ALTER TABLE "Plant" DROP COLUMN "allowManualDateTime";
  END IF;
END $$;

-- Feedback 28: persist explicit Soda N/A on Gate Pass
ALTER TABLE "GatePass" ADD COLUMN IF NOT EXISTS "financeSodaNA" BOOLEAN NOT NULL DEFAULT false;

-- Backend MC Deduction Amount per Boli line:
-- (Current Moisture % − Benchmark Moisture %) × M/C Point
ALTER TABLE "PaddyBoli" ADD COLUMN IF NOT EXISTS "mcDeduction" DOUBLE PRECISION;

-- Base Boli Rate = Today Rate (Base Rate) − M/C Deduction
-- e.g. 2200 − 100 = 2100
ALTER TABLE "PaddyBoli" ADD COLUMN IF NOT EXISTS "baseBoliRate" DOUBLE PRECISION;

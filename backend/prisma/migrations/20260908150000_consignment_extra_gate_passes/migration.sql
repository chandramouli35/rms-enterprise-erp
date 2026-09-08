-- Feedback 19: multi-GP / multi-truck on one consignment entry
ALTER TABLE "ConsignmentDispatch" ADD COLUMN IF NOT EXISTS "extraGatePassIds" TEXT;

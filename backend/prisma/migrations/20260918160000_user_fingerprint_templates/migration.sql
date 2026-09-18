-- Matchable FMR/ISO templates (base64) for 1:1 verify against logged-in user.
-- PidData XML in fingerprint1/2 stays for audit; templates are used for matching.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fingerprint1Template" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fingerprint2Template" TEXT;

-- Sprint 4c: Verification token expiry
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_token_expires_at" TIMESTAMP;

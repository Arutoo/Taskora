-- Sprint 4: Email verification fields on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "email_verified"     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "verification_token" VARCHAR(255);

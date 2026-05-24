-- Sprint 4b: Short invite code + task_unverified action type
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "invite_code" VARCHAR(10) UNIQUE;
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'task_unverified';

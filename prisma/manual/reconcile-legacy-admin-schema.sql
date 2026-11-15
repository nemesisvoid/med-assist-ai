-- ============================================================================
-- One-off reconcile for databases that received an earlier, un-migrated admin
-- schema via `prisma db push` (legacy audit_log / AuditAction / AdminProfile /
-- doctor_invitation tables, user.banned + user.banReason columns).
--
-- Brings such a database to the state produced by migration
-- 20261115140000_admin_console_and_audit_log WITHOUT DROPPING ANY DATA:
--   * the legacy audit log is renamed to "audit_log_legacy" (all rows/columns kept)
--   * rows whose action exists in the new AuditAction enum are copied forward
--   * AdminProfile / doctor_invitation are left untouched (unmanaged by Prisma)
--
-- Run (whole script is one transaction):
--   npx prisma db execute --file prisma/manual/reconcile-legacy-admin-schema.sql
-- then record the migrations it covers:
--   npx prisma migrate resolve --applied 20260621003937_messaging_architecture_overhaul
--   npx prisma migrate resolve --applied 20261115140000_admin_console_and_audit_log
--   npx prisma migrate deploy
--
-- Do NOT run this on a fresh database — use `prisma migrate deploy` instead.
-- ============================================================================

BEGIN;

-- Guard: only run against the legacy shape.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'description'
  ) THEN
    RAISE EXCEPTION 'Legacy audit_log not found — this database does not need the reconcile script.';
  END IF;
END $$;

-- 1. Archive the legacy audit log (rename only; nothing is dropped).
ALTER TABLE "audit_log" RENAME TO "audit_log_legacy";
ALTER TABLE "audit_log_legacy" RENAME CONSTRAINT "audit_log_pkey" TO "audit_log_legacy_pkey";
ALTER TABLE "audit_log_legacy" RENAME CONSTRAINT "audit_log_actorId_fkey" TO "audit_log_legacy_actorId_fkey";
ALTER INDEX IF EXISTS "audit_log_actorId_idx" RENAME TO "audit_log_legacy_actorId_idx";
ALTER INDEX IF EXISTS "audit_log_action_idx" RENAME TO "audit_log_legacy_action_idx";
ALTER INDEX IF EXISTS "audit_log_entityId_idx" RENAME TO "audit_log_legacy_entityId_idx";
ALTER INDEX IF EXISTS "audit_log_createdAt_idx" RENAME TO "audit_log_legacy_createdAt_idx";
ALTER TYPE "AuditAction" RENAME TO "AuditActionLegacy";

-- 2. New audit log (identical to migration 20261115140000_admin_console_and_audit_log).
CREATE TYPE "AuditAction" AS ENUM ('USER_SIGNED_UP', 'USER_SIGNED_IN', 'PASSWORD_RESET', 'USER_ROLE_CHANGED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'USER_SESSIONS_REVOKED', 'DOCTOR_INVITED', 'DOCTOR_INVITE_RESENT', 'DOCTOR_AVAILABILITY_CHANGED', 'APPOINTMENT_REASSIGNED', 'APPOINTMENT_CANCELLED', 'PATIENT_RECORD_VIEWED');

CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Suspension fields: banned / banReason already exist on the legacy schema.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);

-- 4. Carry forward legacy events whose action exists in the new enum.
INSERT INTO "audit_log" ("id", "actorId", "action", "entityType", "entityId", "summary", "metadata", "ipAddress", "userAgent", "createdAt")
SELECT
  l."id",
  l."actorId",
  l."action"::text::"AuditAction",
  COALESCE(l."entityType", 'Unknown'),
  l."entityId",
  l."description",
  (CASE WHEN jsonb_typeof(l."metadata") = 'object' THEN l."metadata" ELSE '{}'::jsonb END)
    || jsonb_build_object('legacy', true, 'actorName', l."actorName", 'actorRole', l."actorRole"::text),
  l."ipAddress",
  NULL,
  l."createdAt"
FROM "audit_log_legacy" l
WHERE l."action"::text IN (SELECT unnest(enum_range(NULL::"AuditAction"))::text);

COMMIT;

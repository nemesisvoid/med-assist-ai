-- Brings migrations in line with schema.prisma. These objects were added to the schema
-- without a migration (likely via `prisma db push`), so the statements are idempotent:
-- they are no-ops on databases that already have them.

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'SYSTEM';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "chatLocksAt" TIMESTAMP(3);

-- Attachment privacy: audit attachment views and sender deletions; soft-delete marker on messages.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTACHMENT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MESSAGE_DELETED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);

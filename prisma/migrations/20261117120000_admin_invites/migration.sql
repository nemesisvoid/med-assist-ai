-- Admin invitations: audit events for inviting administrators by email.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_INVITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_INVITE_RESENT';

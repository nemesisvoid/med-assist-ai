-- Account settings: patients edit their own health profile; patients and clinicians change their password.
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE_FAILED';

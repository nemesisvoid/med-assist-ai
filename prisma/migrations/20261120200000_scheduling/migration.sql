-- Scheduling: clinician working hours, reminder de-duplication, reschedule/profile audit events,
-- and an index for clinician double-booking checks.
-- AlterEnum


ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_RESCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICIAN_PROFILE_UPDATED';

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "workingHours" JSONB;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_doctorId_scheduledAt_idx" ON "Appointment"("doctorId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");


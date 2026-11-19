-- Visit type: in person or video, chosen when booking. Existing appointments become IN_PERSON.
-- CreateEnum
CREATE TYPE "VisitMode" AS ENUM ('IN_PERSON', 'VIDEO');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_VISIT_TYPE_CHANGED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "visitMode" "VisitMode" NOT NULL DEFAULT 'IN_PERSON';


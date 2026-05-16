/*
  Warnings:

  - The values [OTHER] on the enum `Gender` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Gender_new" AS ENUM ('MALE', 'FEMALE');
ALTER TABLE "PatientProfile" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TYPE "Gender" RENAME TO "Gender_old";
ALTER TYPE "Gender_new" RENAME TO "Gender";
DROP TYPE "public"."Gender_old";
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INTAKE_FORM';

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channel" "NotificationChannel" DEFAULT 'IN_APP',
ADD COLUMN     "link" TEXT;

-- CreateIndex
CREATE INDEX "Message_appointmentId_idx" ON "Message"("appointmentId");

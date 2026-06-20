/*
  Warnings:

  - A unique constraint covering the columns `[nextAppointmentId]` on the table `FollowUp` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "nextAppointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_nextAppointmentId_key" ON "FollowUp"("nextAppointmentId");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_nextAppointmentId_fkey" FOREIGN KEY ("nextAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `fileNo` on the `PatientProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[medicalRecordNumber]` on the table `PatientProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `medicalRecordNumber` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PatientProfile_fileNo_key";

-- AlterTable
ALTER TABLE "PatientProfile" DROP COLUMN "fileNo",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "medicalRecordNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_medicalRecordNumber_key" ON "PatientProfile"("medicalRecordNumber");

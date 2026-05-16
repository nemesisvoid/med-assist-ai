/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `PatientProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileNo]` on the table `PatientProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bloodGroup` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileNo` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `genotype` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PatientProfile" DROP CONSTRAINT "PatientProfile_userId_fkey";

-- AlterTable
ALTER TABLE "PatientProfile" DROP COLUMN "imageUrl",
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodGroup" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "fileNo" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "genotype" TEXT NOT NULL,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_fileNo_key" ON "PatientProfile"("fileNo");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Therapist support: provider type and credentials on clinician profiles. Existing clinicians stay DOCTOR.
-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DOCTOR', 'THERAPIST');

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "credentials" TEXT,
ADD COLUMN     "providerType" "ProviderType" NOT NULL DEFAULT 'DOCTOR';


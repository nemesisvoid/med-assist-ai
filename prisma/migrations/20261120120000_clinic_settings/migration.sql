-- Clinic settings: one row of clinic details, hours, visit types and emergency number.
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINIC_SETTINGS_UPDATED';

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'MedAssist Clinic',
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "mapUrl" TEXT,
    "arrivalInstructions" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "openingHours" JSONB NOT NULL,
    "inPersonEnabled" BOOLEAN NOT NULL DEFAULT true,
    "videoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emergencyNumber" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);


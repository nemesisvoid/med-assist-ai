-- Messaging Architecture Overhaul
-- One conversation per patient-doctor pair with activeAppointmentId.
--
-- Steps:
--   1. Add activeAppointmentId column (nullable)
--   2. Consolidate duplicate conversations (same patientId+doctorId) → keep most recent
--   3. Move messages from duplicates to the survivor
--   4. Delete duplicate conversations
--   5. Drop old appointmentId column (and its FK)
--   6. Add FK for activeAppointmentId
--   7. Add @@unique([patientId, doctorId])
--   8. Add @@unique on activeAppointmentId (one-to-one with Appointment)

-- Step 1: Add the new column
ALTER TABLE "Conversation" ADD COLUMN "activeAppointmentId" TEXT;

-- Step 2 + 3 + 4: Consolidate duplicates
-- For each (patientId, doctorId) pair with more than one conversation:
--   a) Find the survivor (most recently updated row)
--   b) Re-point all messages from the duplicates to the survivor
--   c) Delete the now-empty duplicates
DO $$
DECLARE
  dup RECORD;
  survivor_id TEXT;
BEGIN
  FOR dup IN
    SELECT "patientId", "doctorId"
    FROM "Conversation"
    GROUP BY "patientId", "doctorId"
    HAVING COUNT(*) > 1
  LOOP
    -- Pick the most recently updated row as the survivor
    SELECT id INTO survivor_id
    FROM "Conversation"
    WHERE "patientId" = dup."patientId"
      AND "doctorId"  = dup."doctorId"
    ORDER BY "updatedAt" DESC
    LIMIT 1;

    -- Re-point messages from all other rows to the survivor
    UPDATE "Message"
    SET "conversationId" = survivor_id
    WHERE "conversationId" IN (
      SELECT id FROM "Conversation"
      WHERE "patientId" = dup."patientId"
        AND "doctorId"  = dup."doctorId"
        AND id <> survivor_id
    );

    -- Delete the duplicates
    DELETE FROM "Conversation"
    WHERE "patientId" = dup."patientId"
      AND "doctorId"  = dup."doctorId"
      AND id <> survivor_id;
  END LOOP;
END $$;

-- Step 5: Drop old appointmentId FK and column
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_appointmentId_fkey";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "appointmentId";

-- Step 6: Add FK for activeAppointmentId → Appointment
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_activeAppointmentId_fkey"
  FOREIGN KEY ("activeAppointmentId")
  REFERENCES "Appointment"(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Step 7: Unique constraint on (patientId, doctorId) — enforces one conversation per pair
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_patientId_doctorId_key"
  UNIQUE ("patientId", "doctorId");

-- Step 8: Unique constraint on activeAppointmentId (one-to-one with Appointment)
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_activeAppointmentId_key"
  UNIQUE ("activeAppointmentId");

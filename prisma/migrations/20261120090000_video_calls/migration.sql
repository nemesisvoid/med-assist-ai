-- Video calls: audit event for joining an appointment's video room.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VIDEO_CALL_JOINED';

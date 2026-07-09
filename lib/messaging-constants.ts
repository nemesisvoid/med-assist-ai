/**
 * Shared messaging constants — safe to import from both server and client code.
 * NOT a 'use server' file so plain exports are allowed.
 */

/** Appointment statuses that allow sending messages. */
export const MESSAGING_ALLOWED_STATUSES = [
    'PENDING_INTAKE',
    'READY_FOR_REVIEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'NOTES_GENERATED',
    'COMPLETED',
] as const;

export type MessagingAllowedStatus = typeof MESSAGING_ALLOWED_STATUSES[number];

/**
 * Shared messaging constants — safe to import from both server and client code.
 * NOT a 'use server' file so plain exports are allowed.
 */

/** How long after sending a sender can still delete their own message (e.g. the wrong photo). After that it's part of the record. */
export const MESSAGE_DELETE_WINDOW_MS = 15 * 60 * 1000;

/** Days a conversation stays open after its appointment is completed, then it becomes read-only. */
export const CHAT_LOCK_DAYS = 5;

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

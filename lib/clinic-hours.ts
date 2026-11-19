/**
 * Clinic opening hours and booking-slot rules, shared by the booking screen,
 * the admin settings form and the server. Plain module (no server-only imports).
 *
 * Times are clinic-local "HH:MM" (24h). A booking date is the calendar date the
 * patient picked; its weekday is read in UTC because the date input is stored
 * as UTC midnight of that day.
 */

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export type DayHours = { open: string; close: string } | null;
export type OpeningHours = Record<Weekday, DayHours>;

const weekday = { open: '09:00', close: '17:00' };
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mon: weekday,
  tue: weekday,
  wed: weekday,
  thu: weekday,
  fri: weekday,
  sat: null,
  sun: null,
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (value: unknown): value is string => typeof value === 'string' && HHMM.test(value);

/** Reads stored JSON defensively; anything malformed falls back to that day's default. */
export function parseOpeningHours(value: unknown): OpeningHours {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_OPENING_HOURS };
  for (const day of WEEKDAYS) {
    if (!(day in source)) continue;
    const entry = source[day] as { open?: unknown; close?: unknown } | null;
    if (entry === null) result[day] = null;
    else if (entry && isValidTime(entry.open) && isValidTime(entry.close) && entry.open < entry.close) {
      result[day] = { open: entry.open, close: entry.close };
    }
  }
  return result;
}

/** Weekday of a booking date (stored as UTC midnight of the chosen day). */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getUTCDay() + 6) % 7];
}

/** "09:30 AM" → "09:30"; returns null if the slot label isn't a valid time. */
export function slotTo24h(slot: string): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim());
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

/** A slot is bookable if it starts at or after opening time and before closing time. */
export function isSlotWithinHours(hours: DayHours, slot: string): boolean {
  if (!hours) return false;
  const time = slotTo24h(slot);
  return !!time && time >= hours.open && time < hours.close;
}

/** "09:00" → "9:00 AM" for display. */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const formatDayHours = (hours: DayHours) => (hours ? `${formatTime12h(hours.open)} – ${formatTime12h(hours.close)}` : 'Closed');

/** Bookable start times for a day, every `stepMinutes`, as "09:30 AM" labels (the format stored on appointments). */
export function slotsForDay(hours: DayHours, stepMinutes = 30): string[] {
  if (!hours) return [];
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slots: string[] = [];
  for (let m = toMinutes(hours.open); m < toMinutes(hours.close); m += stepMinutes) {
    const h = Math.floor(m / 60);
    const label = `${String(h % 12 || 12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    slots.push(label);
  }
  return slots;
}

/** Today's date ("yyyy-mm-dd") in the clinic's timezone. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** "yyyy-mm-dd" of a booking date (stored as UTC midnight of the chosen day). */
export const bookingDateKey = (date: Date) => date.toISOString().slice(0, 10);

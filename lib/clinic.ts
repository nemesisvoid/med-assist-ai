/**
 * Reads the clinic's settings (single row, edited in Admin → Clinic settings).
 * Server-only. Before an admin has saved anything, sensible defaults are used.
 */

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { DEFAULT_OPENING_HOURS, parseOpeningHours, type OpeningHours } from '@/lib/clinic-hours';

export const CLINIC_SETTINGS_ID = 'default';

export type ClinicSettingsView = {
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  mapUrl: string | null;
  arrivalInstructions: string | null;
  timezone: string;
  openingHours: OpeningHours;
  inPersonEnabled: boolean;
  videoEnabled: boolean;
  emergencyNumber: string | null;
  updatedAt: Date | null;
};

export const DEFAULT_CLINIC_SETTINGS: ClinicSettingsView = {
  name: 'MedAssist Clinic',
  phone: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  mapUrl: null,
  arrivalInstructions: null,
  timezone: 'Africa/Lagos',
  openingHours: DEFAULT_OPENING_HOURS,
  inPersonEnabled: true,
  videoEnabled: true,
  emergencyNumber: null,
  updatedAt: null,
};

/** Memoised per request, so layouts and pages can all read it cheaply. */
export const getClinicSettings = cache(async (): Promise<ClinicSettingsView> => {
  const row = await prisma.clinicSettings.findUnique({ where: { id: CLINIC_SETTINGS_ID } }).catch(() => null);
  if (!row) return DEFAULT_CLINIC_SETTINGS;
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    mapUrl: row.mapUrl,
    arrivalInstructions: row.arrivalInstructions,
    timezone: row.timezone,
    openingHours: parseOpeningHours(row.openingHours),
    inPersonEnabled: row.inPersonEnabled,
    videoEnabled: row.videoEnabled,
    emergencyNumber: row.emergencyNumber,
    updatedAt: row.updatedAt,
  };
});

/** Address lines for display, skipping empty parts. */
export function clinicAddressLines(c: Pick<ClinicSettingsView, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode' | 'country'>): string[] {
  const cityLine = [c.city, c.state, c.postalCode].filter(Boolean).join(', ');
  return [c.addressLine1, c.addressLine2, cityLine, c.country].filter((line): line is string => !!line && line.trim().length > 0);
}

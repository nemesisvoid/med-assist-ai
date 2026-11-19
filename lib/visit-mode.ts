/**
 * Visit type (in person vs video) rules shared by the browser and the server.
 * Plain module (no server-only imports).
 */

import type { VisitMode } from '@/generated/prisma/enums';

export const VISIT_MODES = ['IN_PERSON', 'VIDEO'] as const;

export const VISIT_MODE_LABEL: Record<VisitMode, string> = {
  IN_PERSON: 'In person',
  VIDEO: 'Video consultation',
};

/**
 * A video booking the AI triage rated as serious. The clinician is told to
 * consider seeing the patient in person instead (they can switch the visit type).
 */
export function isHighRiskVideoVisit(a: {
  visitMode?: VisitMode | null;
  riskLevel?: string | null;
  severityLevel?: string | null;
  priority?: string | null;
}): boolean {
  if (a.visitMode !== 'VIDEO') return false;
  return a.riskLevel === 'HIGH' || a.severityLevel === 'HIGH' || a.severityLevel === 'SEVERE' || a.priority === 'HIGH' || a.priority === 'CRITICAL';
}

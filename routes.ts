export const patientRoutes = ['/patient'];
export const doctorRoutes = ['/doctor'];
export const adminRoutes = ['/admin'];

/** Pages only meant for signed-out visitors. Signed-in users are sent to their dashboard. */
export const authRoutes = ['/auth/login', '/auth/forgot-password'];

export const apiRoutes = '/api/auth';

export const LOGIN_PATH = '/auth/login';

/** Post-authentication landing route that forwards the user to their role's dashboard. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

export type AppRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

const dashboardByRole: Record<AppRole, string> = {
  PATIENT: '/patient/dashboard',
  DOCTOR: '/doctor/dashboard',
  ADMIN: '/admin/dashboard',
};

export function getDashboardPath(role: string | null | undefined): string {
  return dashboardByRole[(role as AppRole) ?? 'PATIENT'] ?? dashboardByRole.PATIENT;
}

const areaByRole: Record<AppRole, string> = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };

/**
 * Where to send a user after they authenticate. Honours a `next` path only when it is a
 * same-origin relative path inside the user's own area (prevents open redirects).
 */
export function resolvePostLoginPath(role: string | null | undefined, next?: string | null): string {
  const area = areaByRole[role as AppRole];
  if (next && area && next.startsWith('/') && !next.startsWith('//') && (next === area || next.startsWith(`${area}/`))) {
    return next;
  }
  return getDashboardPath(role);
}

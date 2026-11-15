import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminRoutes, apiRoutes, authRoutes, doctorRoutes, getDashboardPath, LOGIN_PATH, patientRoutes } from './routes';

const matches = (pathname: string, routes: string[]) => routes.some(route => pathname === route || pathname.startsWith(`${route}/`));

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  if (pathname.startsWith(apiRoutes)) return NextResponse.next();

  const session = await auth.api.getSession({ headers: req.headers });
  const role = session?.user?.role;

  const isPatientRoute = matches(pathname, patientRoutes);
  const isDoctorRoute = matches(pathname, doctorRoutes);
  const isAdminRoute = matches(pathname, adminRoutes);
  const isAuthRoute = matches(pathname, authRoutes);

  if (isPatientRoute || isDoctorRoute || isAdminRoute) {
    if (!session) {
      const loginUrl = new URL(LOGIN_PATH, nextUrl);
      loginUrl.searchParams.set('next', `${pathname}${nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const hasAccess =
      (isPatientRoute && role === 'PATIENT') || (isDoctorRoute && role === 'DOCTOR') || (isAdminRoute && role === 'ADMIN');

    // Signed in but on another role's area: send them to their own dashboard.
    if (!hasAccess) return NextResponse.redirect(new URL(getDashboardPath(role), nextUrl));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL(getDashboardPath(role), nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

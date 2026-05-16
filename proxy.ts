import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminRoutes, apiRoutes, authRoutes, doctorRoutes, patientRoutes } from './routes';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const { nextUrl } = req;

  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const isLoggedIn = !!session;
  const role = session?.user?.role;
  const isLoggedInUserPatient = role === 'PATIENT';
  const isLoggedInUserDoctor = role === 'DOCTOR';
  const isLoggedInUserAdmin = role === 'ADMIN';

  const isPatientRoute = patientRoutes.some(route => nextUrl.pathname.startsWith(route));

  const isDoctorRoute = doctorRoutes.some(route => nextUrl.pathname.startsWith(route));

  const isAuthRoute = authRoutes.some(route => nextUrl.pathname.startsWith(route));

  const isAdminRoute = adminRoutes.some(route => nextUrl.pathname.startsWith(route));

  const isProtectedRoutes = isPatientRoute || isDoctorRoute || isAdminRoute;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiRoutes);

  if (isApiAuthRoute) return res;

  if (isProtectedRoutes) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    if (isPatientRoute && !isLoggedInUserPatient) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    if (isDoctorRoute && !isLoggedInUserDoctor) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    if (isAdminRoute && !isLoggedInUserAdmin) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }
  }

  if (isAuthRoute && isLoggedIn) {
    if (isLoggedInUserPatient) {
      return NextResponse.redirect(new URL('/patient/dashboard', nextUrl));
    }
    if (isLoggedInUserDoctor) {
      return NextResponse.redirect(new URL('/doctor/dashboard', nextUrl));
    }
    if (isLoggedInUserAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

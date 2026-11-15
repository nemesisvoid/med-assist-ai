import type { Metadata } from 'next';
import AuthForm from '@/components/auth-form';
import AuthShell from '@/components/auth/auth-shell';
import { isGoogleAuthEnabled } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign in · MedAssist AI',
};

type SearchParams = Promise<{ mode?: string; next?: string; error?: string; reset?: string }>;

const errorMessages: Record<string, string> = {
  oauth: "We couldn't sign you in with Google. Please try again.",
  invalid_token: 'That verification link is invalid or has expired. Sign in to receive a new one.',
  token_expired: 'That verification link has expired. Sign in to receive a new one.',
  session_expired: 'Your session has ended. Please sign in again.',
  banned_user: 'This account has been suspended. Contact support for help.',
};

const LoginPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { mode, next, error, reset } = await searchParams;

  return (
    <AuthShell>
      <AuthForm
        initialMode={mode === 'create' ? 'create' : 'login'}
        next={next}
        googleEnabled={isGoogleAuthEnabled}
        initialError={error ? (errorMessages[error.toLowerCase()] ?? 'Something went wrong. Please sign in again.') : undefined}
        initialNotice={reset === 'success' ? 'Your password has been updated. Sign in with your new password.' : undefined}
      />
    </AuthShell>
  );
};

export default LoginPage;

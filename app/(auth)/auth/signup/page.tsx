import { redirect } from 'next/navigation';

/** Sign-up lives on the combined auth page; keep `/auth/signup` working for shared links. */
const SignUpPage = () => redirect('/auth/login?mode=create');

export default SignUpPage;

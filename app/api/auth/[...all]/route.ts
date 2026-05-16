import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
console.log('=== AUTH HANDLER LOADED ===');
export const { GET, POST } = toNextJsHandler(auth.handler);

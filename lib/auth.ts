import { betterAuth } from 'better-auth';
import { prisma } from '@/lib/prisma';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: ['PATIENT', 'DOCTOR'],
        required: false,
        input: false,
        defaultValue: 'PATIENT',
      },
    },
  },
  plugins: [nextCookies()],
});

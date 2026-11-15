import { doctors } from '@/constants';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SEED_DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD ?? 'password1234';

async function seedDoctors() {
  for (const doctor of doctors) {
    const existing = await prisma.user.findUnique({ where: { email: doctor.email } });
    if (existing) {
      console.log(`- skipping ${doctor.email} (already exists)`);
      continue;
    }

    const res = await auth.api.signUpEmail({
      body: {
        email: doctor.email,
        password: SEED_DOCTOR_PASSWORD,
        name: doctor.name,
      },
    });

    // Seeded clinicians are trusted accounts: promote to DOCTOR and skip email verification.
    await prisma.user.update({
      where: { id: res.user.id },
      data: { role: 'DOCTOR', emailVerified: true, image: doctor.image },
    });

    await prisma.doctorProfile.create({
      data: {
        imageUrl: doctor.image,
        bio: doctor.bio,
        specialty: doctor.specialty,
        userId: res.user.id,
        yearsOfExperience: doctor.experience,
      },
    });
    console.log(`+ seeded ${doctor.email}`);
  }
}

/**
 * Creates the first administrator when SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set.
 * Admin accounts can't be created through public sign-up (roles are server-assigned).
 */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('- skipping admin (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', emailVerified: true } });
    console.log(`- admin ${email} already exists (ensured ADMIN role)`);
    return;
  }

  const res = await auth.api.signUpEmail({
    body: { email, password, name: process.env.SEED_ADMIN_NAME ?? 'Platform Admin' },
  });
  await prisma.user.update({ where: { id: res.user.id }, data: { role: 'ADMIN', emailVerified: true } });
  console.log(`+ seeded admin ${email}`);
}

async function main() {
  await seedAdmin();
  await seedDoctors();
  console.log('Seed completed successfully');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

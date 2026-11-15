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

async function main() {
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

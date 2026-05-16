import { doctors } from '@/constants';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
async function main() {
  for (const doctor of doctors) {
    const res = await auth.api.signUpEmail({
      body: {
        email: doctor.email,
        password: 'password1234',
        name: doctor.name,
      },
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
  }

  console.log('doctors seeded successfully');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

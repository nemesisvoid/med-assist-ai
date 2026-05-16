'use server';

import { prisma } from '@/lib/prisma';

export const getDoctorById = async (doctorId: string) => {
  try {
    const res = await prisma.doctorProfile.findUnique({
      where: {
        userId: doctorId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    return res;
  } catch (error) {
    console.log(error);
  }
};

export const getAllDoctors = async () => {
  const res = await prisma.user.findMany({
    where: {
      role: 'DOCTOR',
    },
  });

  return res;
};

export const searchDoctors = async query => {
  try {
    const res = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            doctorProfile: {
              specialty: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        doctorProfile: {
          select: {
            availabilityStatus: true,
            specialty: true,
            yearsOfExperience: true,
            bio: true,
            imageUrl: true,
          },
        },
      },
      take: 5,
    });
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

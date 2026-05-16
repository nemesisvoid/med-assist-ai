'use server';

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({});

async function main() {
  const prompt = "Explain the concept of Occam's Razor and provide a simple, everyday example.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  console.log(response.text);
}

main();
import { prisma } from '@/lib/prisma';
import { AppointmentFormSchema, PatientInTakeFormSchema, PatientProfileFormSchema } from '@/validations/validation';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { generateMedicalRecordNumber } from '@/lib/utils';
import { createNotification } from './notification.action';

export const getPatientProfile = async (userId: string | undefined) => {
  try {
    if (!userId) throw new Error('User not found');
    const res = await prisma.patientProfile.findUnique({
      where: {
        userId: userId,
      },
    });
    return res;
  } catch (error) {
    console.log(error, 'error getting profile');
  }
};

export const createPatientProfile = async (userId: string | undefined, formData: z.infer<typeof PatientProfileFormSchema>) => {
  try {
    if (!userId) throw new Error('User not found');

    const validatedData = PatientProfileFormSchema.safeParse(formData);

    if (!validatedData.success) throw new Error(validatedData.error.message);

    const { data } = validatedData;
    const res = await prisma.patientProfile.create({
      data: {
        medicalRecordNumber: generateMedicalRecordNumber(),
        userId: userId,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        genotype: data.genotype,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        medications: data.medications,
        medicalHistory: data.medicalHistory,
        emergencyContact: data.emergencyContact,
        insuranceProvider: data.insuranceProvider,
      },
    });
    revalidatePath('/patient/dashboard');
    revalidatePath('/patient/appointment/create-appointment');
    return { success: true, message: 'Profile created successfully' };
  } catch (error) {
    console.log(error, 'error creating profile');
    return { success: false, message: 'Failed to create profile' };
  }
};

export const createAppointment = async (userId: string, formData: z.infer<typeof AppointmentFormSchema>) => {
  try {
    const validatedData = AppointmentFormSchema.safeParse(formData);
    if (!validatedData.success) {
      throw new Error(validatedData.error.message);
    }

    const { data } = validatedData;
    const res = await prisma.appointment.create({
      data: {
        patientId: userId,
        scheduledAt: data.scheduledAt,
        scheduledTime: data.scheduledTime,
        appointmentReason: data.appointmentReason,
        appointmentType: data.appointmentType,
        doctorId: data.doctor,
      },
    });

    await prisma.notification.create({
      data: {
        type: 'APPOINTMENT',
        userId,
        title: 'Appointment Scheduled',
        message: 'Your appointment has been successfully scheduled.',
      },
    });

    await prisma.notification.create({
      data: {
        type: 'INTAKE_FORM',
        userId,
        title: 'Appointment Scheduled',
        message: `Please complete your intake form for your ${res.appointmentType} appointment`,
      },
    });

    if (data.doctor) {
      await prisma.notification.create({
        data: {
          title: 'New Appointment Assigned',
          userId: data.doctor,
          message: `A new patient appointment has been assigned to you`,
          type: 'APPOINTMENT',
        },
      });
    }
    return { success: true, message: 'Appointment created successfully' };
  } catch (error) {
    console.log('Error creating appointment:', error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const createIntakeForm = async (userId: string, formData: z.infer<typeof PatientInTakeFormSchema>) => {
  try {
    const res = await prisma.intakeForm.create({
      data: {
        appointmentId: formData.appointmentId,
        chiefComplaint: formData.complaint,
        currentSymptoms: formData.currentSymptoms,
        painLevel: Number(formData.painLevel),
        allergies: formData.allergies,
        medications: formData.medication,
        additionalNotes: formData.additionalNotes,
      },
    });
    analyzeAppointment(formData.appointmentId);
    return { success: true, message: 'Intake form created successfully' };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const getPatientAppointments = async (userId: string) => {
  const res = await prisma.appointment.findMany({
    where: {
      patientId: userId,
    },
    include: {
      intakeForm: {
        select: { id: true },
      },
      doctor: {
        select: {
          name: true,
        },
      },
    },
  });
  return res;
};

export const getPatientNotifications = async (userId: string) => {
  const res = await prisma.notification.findMany({
    where: {
      userId: userId,
    },
  });
  return res;
};

export const analyzeAppointment = async (appointmentId: string) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        intakeForm: true,
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    });

    if (!appointment || !appointment.intakeForm) throw new Error('Appointment not found');

    const prompt = `
You are an expert AI clinical triage assistant operating in an advanced health management framework.
Your task is to analyze the following patient intake information and assign accurate, safe, and consistent risk, severity, and priority values.

--- CLINICAL EVALUATION CRITERIA ---
1. RISK LEVEL:
   - HIGH: Life-threatening potential, unstable vital indications, severe acute changes, or high potential for rapid deterioration.
   - MEDIUM: Sub-acute conditions, distressing symptoms requiring timely intervention, or potential drug/allergy interactions.
   - LOW: Routine or chronic conditions that are stable, minor acute symptoms, or preventative care visits.

2. SEVERITY LEVEL:
   - SEVERE: Constant excruciating pain (7-10/10), signs of shock, acute respiratory distress, anaphylaxis, or systemic organ distress.
   - HIGH: Significant disabling pain or impairment, high fever, progressive infection, or acute psychological crisis.
   - MODERATE: Mild-to-moderate discomfort, localized stable inflammation, or recurring manageable chronic symptoms.
   - LOW: Minimal physical distress, minor discomfort, or asymptomatic presentations.

3. PRIORITY LEVEL:
   - CRITICAL: Immediate clinical review required. High risk of immediate decompensation (e.g., chest pain, sudden numbness, severe breathing issues).
   - HIGH: Needs attention within a few hours. High pain indices or rapidly worsening infections.
   - MEDIUM: Standard scheduling. Needs tracking but stable.
   - LOW: Elective, routine maintenance, or minor self-limiting complaints.

--- PATIENT INTAKE DATA ---
Chief Complaint: ${appointment.intakeForm.chiefComplaint}
Symptoms: ${appointment.intakeForm.currentSymptoms}
Pain Level: ${appointment.intakeForm.painLevel ?? 'Not specified'}/10
Allergies: ${appointment.intakeForm.allergies ?? 'None noted'}
Medications: ${appointment.intakeForm.medications ?? 'None noted'}
Medical History: ${appointment.patient.patientProfile?.medicalHistory ?? 'None provided'}

--- INSTRUCTIONS ---
- Cross-reference current symptoms and chief complaints against any listed Allergies, Medications, and Medical History to spot contraindications or hidden complications.
- Keep the "aiRiskSummary" clinical,objective, concise (2-3 sentences), and free of conversational filler.
- Keep the "aiRecommendation" actionable for the receiving doctor (e.g., specific diagnostics to review, immediate protocols to verify).

Return ONLY a valid JSON object matching this exact format schema without markdown wrappers:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "severityLevel": "LOW" | "MODERATE" | "HIGH" | "SEVERE",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "aiRiskSummary": "string",
  "aiRecommendation": "string"
}
`;

    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,

      config: {
        responseMimeType: 'application/json',
        // thinkingConfig: {
        //   thinkingLevel: ThinkingLevel.MEDIUM,
        // },
      },
    });

    const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No AI response');
    }

    const parsed = JSON.parse(text);

    await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        riskLevel: parsed.riskLevel,
        severityLevel: parsed.severityLevel,
        priority: parsed.priority,
        aiRiskSummary: parsed.aiRiskSummary,
        aiRecommendation: parsed.aiRecommendation,
        status: 'READY_FOR_REVIEW',
      },
    });
    await createNotification({
      userId: appointment.patientId,
      type: 'INTAKE_FORM',
      title: 'Triage Profile Updated',
      message: 'Your pre-appointment medical intake has been securely reviewed and updated.',
    });

    if (appointment.doctorId) {
      const painValue = appointment.intakeForm.painLevel ? Number(appointment.intakeForm.painLevel) : 0;

      const isUrgentCase =
        parsed.riskLevel === 'HIGH' ||
        parsed.severityLevel === 'HIGH' ||
        parsed.severityLevel === 'SEVERE' ||
        parsed.priority === 'HIGH' ||
        parsed.priority === 'CRITICAL' ||
        painValue >= 7;

      let notificationTitle = 'AI Triage Analysis Complete';
      let notificationMessage = `Triage report ready for ${appointment.patient.name || 'Patient'}. Priority: ${parsed.priority}.`;

      if (isUrgentCase) {
        notificationTitle = '🚨 URGENT: High Triage Alert';
        notificationMessage = `Attention Required: ${appointment.patient.name || 'Patient'} flagged with heightened levels (${parsed.severityLevel} severity / Pain: ${painValue}/10). Summary: ${parsed.aiRiskSummary}`;
      }

      await createNotification({
        userId: appointment.doctorId,
        type: 'APPOINTMENT',
        title: notificationTitle,
        message: notificationMessage,
      });
    }

    return {
      success: true,
      message: 'AI analysis completed successfully',
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'AI analysis failed',
    };
  }
};

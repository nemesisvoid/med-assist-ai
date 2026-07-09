'use server';
import * as z from 'zod'

import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification.action';
import { getAge } from '@/lib/utils';
import { startOfDay, subDays, subMonths, startOfYear, format } from 'date-fns';
import { clinicalNotesSchema } from '@/schema/validators';
import { AppointmentStatus } from '@/generated/prisma/enums';

const ai = new GoogleGenAI({});


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

export const searchDoctors = async (query: string) => {
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

export const getDoctorsAppointments = async (doctorId: string) => {
  const res = await prisma.appointment.findMany({
    where: {
      doctorId: doctorId,
    },
    include: {
      intakeForm: {
        select: {
          id: true,
          painLevel: true,
        },
      },
      patient: {
        select: {
          name: true,
        },
      },
    },
  });
  return res;
};

export const getDoctorAppointmentById = async (appointmentId: string) => {
  const res = await prisma.appointment.findUnique({
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
      clinicalNote: {
        include: {
          prescriptions: true
        }
      },
      doctor: {
        include: {
          doctorProfile: true,
        },
      },
    },
  });
  return res;
};

export const saveClinicalNoteAction = async (appointmentId: string, doctorId: string, data: z.infer<typeof clinicalNotesSchema>) => {
  try {
    const updatedNote = await prisma.clinicalNote.upsert({
      where: {
        appointmentId,
      },
      update: {
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        diagnosis: data.diagnosis,
        treatmentPlan: data.treatmentPlan,
        patientSummaryNote: data.patientSummaryNote,
        createdByDoctorId: doctorId,
        ...(data.prescriptions ? {
          prescriptions: {
            deleteMany: {},
            ...(data.prescriptions.length > 0 && {
              createMany: {
                data: data.prescriptions.map((p) => ({
                  medicationName: p.medicationName,
                  dosage: p.dosage,
                  frequency: p.frequency,
                  duration: p.duration,
                })),
              },
            }),
          },
        } : {}),
      },
      create: {
        appointmentId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        treatmentPlan: data.treatmentPlan,
        diagnosis: data.diagnosis,
        ...(data.prescriptions && data.prescriptions.length > 0 && {
          prescriptions: {
            createMany: {
              data: data.prescriptions.map((p) => ({
                medicationName: p.medicationName,
                dosage: p.dosage,
                frequency: p.frequency,
                duration: p.duration,
              })),
            },
          },
        }),
        patientSummaryNote: data.patientSummaryNote,
        createdByDoctorId: doctorId,
      },
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    // Build follow-up payload conditionally
    const followUpPayload = data.requiresFollowUp && data.followUpDate
      ? {
        upsert: {
          create: {
            reason: data.followUpReason,
            recommendedDate: new Date(data.followUpDate),
            recommendedTime: data.followUpTime,
            additionalNotes: data.followUpNotes,
          },
          update: {
            reason: data.followUpReason,
            recommendedDate: new Date(data.followUpDate),
            recommendedTime: data.followUpTime,
            additionalNotes: data.followUpNotes,
          },
        },
      }
      : undefined;

    // Update appointment status and follow-up flag
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        requiresFollowUp: data.requiresFollowUp ?? false,
        status: AppointmentStatus.NOTES_GENERATED,
        ...(followUpPayload && { followUp: followUpPayload }),
      },
    });

    // Add notification to timeline or system
    await prisma.notification.create({
      data: {
        userId: doctorId,
        type: 'CLINICAL_NOTE',
        title: 'Clinical Notes Saved',
        message: `Clinical documentation for ${appointment?.appointmentType || 'appointment'} has been updated.`,
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true, note: updatedNote };
  } catch (error) {
    console.error('Error saving clinical notes:', error);
    return { success: false, message: 'Failed to save clinical notes' };
  }
};

export const generateSoapDraftAction = async (appointmentId: string) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        intakeForm: true,
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    });

    if (!appointment || !appointment.intakeForm) {
      throw new Error('Appointment or intake form not found.');
    }

    const patientProfile = appointment.patient.patientProfile;
    const age = getAge(patientProfile?.dateOfBirth);

    const prompt = `
You are an expert AI clinical documentation assistant. Generate a professional SOAP (Subjective, Objective, Assessment, Plan) note draft based on the patient intake data.

--- PATIENT INFO ---
Name: ${appointment.patient.name}
Gender: ${patientProfile?.gender || 'N/A'}
Age/DOB: ${age}
Allergies: ${patientProfile?.allergies || appointment.intakeForm.allergies || 'None noted'}
Current Medications: ${patientProfile?.medications || appointment.intakeForm.medications || 'None noted'}
Medical History: ${patientProfile?.medicalHistory || 'None noted'}

--- INTAKE FORM ---
Chief Complaint: ${appointment.intakeForm.chiefComplaint}
Current Symptoms: ${appointment.intakeForm.currentSymptoms}
Pain Level: ${appointment.intakeForm.painLevel ?? 'N/A'}/10
Additional Notes: ${appointment.intakeForm.additionalNotes || 'None'}

--- INSTRUCTIONS ---
Generate structured, clean clinical notes for the following 4 sections of SOAP:
1. Subjective: Patient's history, timeline of symptoms, complaint, history, etc.
2. Objective: Pain score, visible symptoms, current medications, allergies, and physical metrics mentioned.
3. Assessment: General workflow priority, urgency indicators (flag any potential issues, non-diagnostic phrasing, e.g. "Presentation consistent with...", "Urgency indicators are...").
4. Plan: Actions recommended for provider review (further consultations, checkups, guidelines).

Ensure the wording feels like AI-assisted workflow guidance rather than definitive medical diagnosis.

Return ONLY a valid JSON object matching this exact format schema without markdown wrappers:
{
  "subjective": "string",
  "objective": "string",
  "assessment": "string",
  "plan": "string"
}
`;

    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Failed to generate SOAP content.');
    }

    const parsed = JSON.parse(text);

    // Save draft back to appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        aiSoapSubjective: parsed.subjective,
        aiSoapObjective: parsed.objective,
        aiSoapAssessment: parsed.assessment,
        aiSoapPlan: parsed.plan,
        status: 'NOTES_GENERATED',
      },
    });

    // Log event in Notification system as timeline log
    await prisma.notification.create({
      data: {
        userId: appointment.patientId,
        type: 'SYSTEM',
        title: 'AI SOAP Draft Generated',
        message: 'A clinical SOAP note draft has been generated by the AI assistant.',
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true, draft: parsed };
  } catch (error) {
    console.error('Error generating SOAP draft:', error);
    return { success: false, message: 'Failed to generate AI SOAP draft.' };
  }
};


export const applySoapDraftAction = async (appointmentId: string, doctorId: string) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment || !appointment.aiSoapSubjective) {
      throw new Error('No AI SOAP draft found to apply.');
    }

    const updatedNote = await prisma.clinicalNote.upsert({
      where: {
        appointmentId,
      },
      update: {
        subjective: appointment.aiSoapSubjective,
        objective: appointment.aiSoapObjective,
        assessment: appointment.aiSoapAssessment,
        plan: appointment.aiSoapPlan,
        createdByDoctorId: doctorId,
      },
      create: {
        appointmentId,
        subjective: appointment.aiSoapSubjective,
        objective: appointment.aiSoapObjective,
        assessment: appointment.aiSoapAssessment,
        plan: appointment.aiSoapPlan,
        createdByDoctorId: doctorId,
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true, note: updatedNote };
  } catch (error) {
    console.error('Error applying AI SOAP draft:', error);
    return { success: false, message: 'Failed to apply AI SOAP draft.' };
  }
};

export const generatePatientSummaryNotes = async (appointmentId: string, draftData?: any) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        intakeForm: true,
        patient: {
          include: { patientProfile: true },
        },
        doctor: true,
        followUp: true,
        clinicalNote: {
          include: { prescriptions: true },
        },
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    const note = appointment.clinicalNote;
    const followUp = appointment.followUp;
    const intake = appointment.intakeForm;
    const doctor = appointment.doctor;
    
    // Prioritize draft data (unsaved form values) over DB values
    const subjective = draftData?.subjective ?? note?.subjective ?? 'Not recorded';
    const objective = draftData?.objective ?? note?.objective ?? 'Not recorded';
    const assessment = draftData?.assessment ?? note?.assessment ?? 'Not recorded';
    const plan = draftData?.plan ?? note?.plan ?? 'Not recorded';
    const diagnosis = draftData?.diagnosis ?? note?.diagnosis ?? 'Not recorded';
    const treatmentPlan = draftData?.treatmentPlan ?? note?.treatmentPlan ?? 'Not recorded';
    
    const prescriptions = draftData?.prescriptions?.length 
        ? draftData.prescriptions 
        : (note?.prescriptions ?? []);
        
    const requiresFollowUp = draftData?.requiresFollowUp ?? !!followUp;
    const followUpDate = draftData?.followUpDate 
        ? new Date(draftData.followUpDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : (followUp?.recommendedDate ? new Date(followUp.recommendedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null);
    const followUpTime = draftData?.followUpTime ?? followUp?.recommendedTime;
    const followUpReason = draftData?.followUpReason ?? followUp?.reason;
    const followUpNotes = draftData?.followUpNotes ?? followUp?.addtionalNotes;

    const prompt = `You are a compassionate and highly skilled medical communication specialist at a modern telehealth platform called MedAssist AI. Your job is to generate a clear, warm, and easy-to-understand appointment summary letter addressed directly to the patient.

The summary must:
- Use plain, jargon-free language that any adult can understand
- Be warm and reassuring in tone — never cold or clinical
- Be well-structured with clear sections
- Only include sections where data is actually available (skip sections with no data)
- NOT include any markdown formatting symbols like **, ##, or --- in the output — write in clean readable prose with section headings only

Here is the full appointment data:

APPOINTMENT DETAILS:
- Appointment Type: ${appointment.appointmentType}
- Reason for Visit: ${appointment.appointmentReason}
- Date: ${new Date(appointment.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${appointment.scheduledTime ?? 'Not specified'}
- Status: ${appointment.status}
- Assigned Doctor: ${doctor?.name ?? 'Not yet assigned'}

PATIENT INTAKE (What the patient reported before the appointment):
- Chief Complaint: ${intake?.chiefComplaint ?? 'Not provided'}
- Current Symptoms: ${intake?.currentSymptoms ?? 'Not provided'}
- Pain Level: ${intake?.painLevel != null ? `${intake.painLevel}/10` : 'Not reported'}
- Known Allergies: ${intake?.allergies ?? 'None reported'}
- Current Medications (at intake): ${intake?.medications ?? 'None reported'}
- Additional Patient Notes: ${intake?.additionalNotes ?? 'None'}

DOCTOR'S CLINICAL FINDINGS:
- Subjective Notes: ${subjective}
- Objective Observations: ${objective}
- Assessment: ${assessment}
- Clinical Plan: ${plan}
- Formal Diagnosis: ${diagnosis}
- Treatment Plan: ${treatmentPlan}

PRESCRIPTIONS:
${prescriptions.length > 0
        ? prescriptions.map((p: any, i: number) =>
          `${i + 1}. ${p.medicationName} — ${p.dosage}, taken ${p.frequency} for ${p.duration}`
        ).join('\n')
        : 'No medications prescribed at this time.'
      }

FOLLOW-UP CARE:
${requiresFollowUp && followUpDate
        ? `A follow-up appointment has been scheduled.
- Recommended Date: ${followUpDate}
- Recommended Time: ${followUpTime ?? 'To be confirmed'}
- Reason for Follow-up: ${followUpReason ?? 'Not specified'}
- Additional Instructions: ${followUpNotes ?? 'None provided'}`
        : 'No follow-up appointment has been scheduled at this time.'
      }

Now write the complete patient summary letter. Structure it with these clearly labeled sections (write them as plain headings, not markdown):

1. "Your Appointment Summary" — A brief intro paragraph welcoming the patient and summarising the appointment date, time, type, and attending doctor.
2. "Why You Came In" — A patient-friendly restatement of their reason for visiting and what symptoms they reported.
3. "What the Doctor Found" — A clear, plain-English explanation of the doctor's findings, assessment, and diagnosis (if available).
4. "Your Treatment Plan" — What the doctor has recommended, including any lifestyle advice or clinical steps.
5. "Your Prescriptions" — List each medication, what it is for, how to take it, and for how long. If none, say so kindly.
6. "Your Next Appointment" — If a follow-up is scheduled, explain the date, time, and why it is important. If not, offer a gentle reminder to reach out if symptoms worsen.
7. "A Note from Your Care Team" — A warm, encouraging closing paragraph reminding the patient they can always message their doctor through the platform with questions.

Important rules:
- Write in second person (you / your) — address the patient directly
- Keep every section concise but complete
- Do not fabricate or invent clinical details that are not in the data above
- If a field is "Not recorded" or "None", handle it gracefully — do not just repeat "Not recorded", instead say something like "Your doctor has not yet recorded this detail" or simply omit it
- Output only the final letter text — no preamble, no metadata, no explanations`;

    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { success: false, message: 'Failed to generate patient summary notes.' };
    }

    await prisma.clinicalNote.update({
      where: { appointmentId },
      data: { patientSummaryNote: text.trim() },
    });

    return { success: true, summary: text.trim() };
  } catch (error) {
    console.error('Error generating patient summary notes:', error);
    return { success: false, message: 'Failed to generate patient summary notes.' };
  }
};

export const markAppointmentCompleteAction = async (appointmentId: string, doctorId: string) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
      include: { patient: { select: { name: true } } },
    });

    // ── Chat grace-period: lock chat 7 days after completion ──────────────────
    const chatLocksAt = new Date();
    chatLocksAt.setDate(chatLocksAt.getDate() + 5);

    const conversation = await prisma.conversation.findFirst({
      where: { patientId: appointment.patientId, doctorId: appointment.doctorId ?? doctorId },
      select: { id: true, patientId: true },
    });

    if (conversation) {
      // Keep the active appointment linked so the chat section can read its status;
      // chatLocksAt is the real gate that locks the conversation after 5 days.
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { chatLocksAt },
      });

      // Inject a SYSTEM message so both participants see the lock countdown
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          appointmentId,
          senderId: doctorId,
          receiverId: conversation.patientId,
          content: `This appointment has been marked as complete. Chat history for this appointment will be locked on ${chatLocksAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. You have 5 days to review your messages.`,
          messageStatus: 'SYSTEM',
        },
      });
    }

    // Notify patient
    await prisma.notification.create({
      data: {
        userId: appointment.patientId,
        type: 'APPOINTMENT',
        title: 'Appointment Completed',
        message: 'Your telehealth appointment summary is now available. Click "View details" to review it.',
        link: `/patient/appointment/${appointmentId}`,
      },
    });

    // Notify doctor timeline
    await prisma.notification.create({
      data: {
        userId: doctorId,
        type: 'SYSTEM',
        title: 'Appointment Marked Complete',
        message: `Appointment for patient is now finalized.`,
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error completing appointment:', error);
    return { success: false, message: 'Failed to complete appointment.' };
  }
};

export const sendPatientNotificationAction = async ({
  patientId,
  title,
  message,
}: {
  patientId: string;
  title: string;
  message: string;
}) => {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: patientId,
        type: 'MESSAGE',
        title: title,
        message: message,
      },
    });
    return { success: true, notification: notif };
  } catch (error) {
    console.error('Error sending notification to patient:', error);
    return { success: false, message: 'Failed to send notification.' };
  }
};

export const requestUpdatedIntakeAction = async (appointmentId: string, patientId: string) => {
  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'PENDING_INTAKE',
      },
    });

    await prisma.notification.create({
      data: {
        userId: patientId,
        type: 'INTAKE_FORM',
        title: 'Updated Intake Form Requested',
        message: 'Your healthcare provider has requested updated intake information. Please review and resubmit.',
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error requesting updated intake:', error);
    return { success: false, message: 'Failed to request updated intake.' };
  }
};


export const getDoctorProfile = async (userId: string | undefined) => {
  try {
    if (!userId) throw new Error('User not found');
    const res = await prisma.doctorProfile.findUnique({
      where: {
        userId: userId,
      },
    });
    return res;
  } catch (error) {
    console.log(error, 'error getting profile');
  }
};

export const getRecentPatients = async (doctorId: string) => {
  try {
    const recentAppointments = await prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { updatedAt: 'desc' },
      take: 20, // Fetch recent enough to get distinct
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            patientProfile: {
              select: {
                dateOfBirth: true,
                bloodGroup: true,
                gender: true,
              }
            }
          }
        }
      }
    });

    // Deduplicate patients
    const seenPatientIds = new Set();
    const recentPatients = [];

    for (const appt of recentAppointments) {
      if (!seenPatientIds.has(appt.patient.id)) {
        seenPatientIds.add(appt.patient.id);
        recentPatients.push({
          patient: appt.patient,
          lastAppointment: {
            id: appt.id,
            reason: appt.appointmentReason,
            type: appt.appointmentType,
            scheduledAt: appt.scheduledAt,
          }
        });
      }
      if (recentPatients.length >= 8) break; // Limit to 8 recent patients
    }

    return recentPatients;
  } catch (error) {
    console.error('Error fetching recent patients:', error);
    return [];
  }
};

export const getPatientFullRecord = async (patientId: string, doctorId: string) => {
  try {
    // GUARD CLAUSE: Ensure the doctor is authorized to view this patient
    // A doctor is authorized if they have at least one appointment with the patient.
    const hasAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patientId,
        doctorId: doctorId,
      },
    });

    if (!hasAppointment) {
      throw new Error('Unauthorized: You are not assigned to this patient.');
    }

    // Fetch the full medical record
    const record = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
        patientAppointments: {
          where: { doctorId: doctorId },
          orderBy: { scheduledAt: 'desc' },
          include: {
            intakeForm: true,
            doctor: {
              select: {
                name: true,
                doctorProfile: {
                  select: {
                    specialty: true,
                  }
                }
              }
            },
            clinicalNote: {
              include: {
                prescriptions: true,
              }
            }
          }
        }
      }
    });

    return record;
  } catch (error) {
    console.error('Error fetching full medical record:', error);
    throw error;
  }
};

export const getDashboardAnalytics = async (doctorId: string, timeRange: '7d' | '30d' | '6m' | '1y') => {
  try {
    let startDate = new Date();
    
    if (timeRange === '7d') startDate = subDays(new Date(), 6);
    else if (timeRange === '30d') startDate = subDays(new Date(), 29);
    else if (timeRange === '6m') startDate = subMonths(new Date(), 5);
    else if (timeRange === '1y') startDate = startOfYear(new Date());

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: startOfDay(startDate)
        }
      },
      select: {
        scheduledAt: true,
      }
    });

    const groupedData: Record<string, number> = {};
    
    // Initialize map to ensure empty dates show as 0
    if (timeRange === '7d' || timeRange === '30d') {
      const days = timeRange === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        groupedData[format(d, 'MMM d')] = 0;
      }
      appointments.forEach(appt => {
        const key = format(new Date(appt.scheduledAt), 'MMM d');
        if (groupedData[key] !== undefined) {
          groupedData[key]++;
        }
      });
    } else {
      const months = timeRange === '6m' ? 6 : (new Date().getMonth() + 1);
      for (let i = months - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        groupedData[format(d, 'MMM yyyy')] = 0;
      }
      appointments.forEach(appt => {
        const key = format(new Date(appt.scheduledAt), 'MMM yyyy');
        if (groupedData[key] !== undefined) {
          groupedData[key]++;
        }
      });
    }

    return Object.entries(groupedData).map(([date, appointments]) => ({
      date,
      appointments
    }));
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return [];
  }
};

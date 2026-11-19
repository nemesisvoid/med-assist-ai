'use server';
import * as z from 'zod'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notifications';
import { formatDoctorName, getAge, hasSavedClinicalNote } from '@/lib/utils';
import { startOfDay, subDays, subMonths, startOfYear, format } from 'date-fns';
import { clinicalNotesSchema } from '@/schema/validators';
import { AppointmentStatus } from '@/generated/prisma/enums';
import { recordAudit } from '@/lib/audit';
import { CHAT_LOCK_DAYS } from '@/lib/messaging-constants';
import { aiFailure, generateJson, generateText } from '@/lib/ai';
import { runTriage } from '@/lib/triage';
import { authFailure, getSessionWithRole, requireAssignedDoctor, requireRole } from '@/lib/authz';

/*
 * Doctor server actions.
 *
 * Every export here is a public endpoint. The doctor is always the signed-in
 * user (from the session), and actions on an appointment require the caller to
 * be the doctor assigned to it. Completed or cancelled appointments are locked.
 */

const SoapDraftSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});


/** Public profile of a doctor, for the booking flow. */
export const getDoctorById = async (doctorId: string) => {
  try {
    const session = await getSessionWithRole();
    if (!session) return null;
    const res = await prisma.doctorProfile.findFirst({
      where: { userId: doctorId, user: { role: 'DOCTOR' } },
      select: {
        specialty: true,
        yearsOfExperience: true,
        bio: true,
        imageUrl: true,
        availabilityStatus: true,
        user: { select: { name: true } },
      },
    });
    return res;
  } catch (error) {
    console.log(error);
  }
};

/** Bookable doctors matching a search (signed-in users only; public profile fields only). */
export const searchDoctors = async (query: string) => {
  try {
    const session = await getSessionWithRole();
    if (!session) return [];
    const res = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        banned: false,
        accounts: { some: {} },
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
      select: {
        id: true,
        name: true,
        image: true,
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

export const getDoctorsAppointments = async () => {
  const session = await getSessionWithRole('DOCTOR');
  if (!session) return [];
  const res = await prisma.appointment.findMany({
    where: {
      doctorId: session.user.id,
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
  const session = await getSessionWithRole('DOCTOR');
  if (!session) return null;
  const res = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
      doctorId: session.user.id,
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

export const saveClinicalNoteAction = async (appointmentId: string, input: z.infer<typeof clinicalNotesSchema>) => {
  try {
    const { session } = await requireAssignedDoctor(appointmentId, { requireOpen: true });
    const doctorId = session.user.id;

    const parsed = clinicalNotesSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: 'Please check the clinical notes form and try again.' };
    const data = parsed.data;

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
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error saving clinical notes:', error);
    return { success: false, message: 'Failed to save clinical notes' };
  }
};

export const generateSoapDraftAction = async (appointmentId: string) => {
  try {
    await requireAssignedDoctor(appointmentId, { requireOpen: true });
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

    const parsed = await generateJson(prompt, SoapDraftSchema);

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
    const failure = authFailure(error) ?? aiFailure(error, 'SOAP draft');
    if (failure) return failure;
    console.error('Error generating SOAP draft:', error);
    return { success: false, message: 'Failed to generate AI SOAP draft.' };
  }
};


/**
 * Re-run AI triage for an appointment whose intake was never scored (e.g. the
 * AI quota was exhausted when the patient submitted it). Only the assigned
 * doctor can trigger it.
 */
export const retryTriageAction = async (appointmentId: string) => {
  try {
    await requireAssignedDoctor(appointmentId, { requireOpen: true });
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    throw error;
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { aiRiskSummary: true, intakeForm: { select: { id: true } } },
  });
  if (!appointment) return { success: false, message: 'Appointment not found.' };
  if (!appointment.intakeForm) {
    return { success: false, message: 'The patient has not submitted an intake form yet.' };
  }
  if (appointment.aiRiskSummary) {
    return { success: true, message: 'AI triage is already complete.' };
  }

  try {
    const result = await runTriage(appointmentId, { notifyDoctorOnFailure: false });
    revalidatePath(`/doctor/appointment/${appointmentId}`);
    if (result.ok) return { success: true, message: 'AI triage complete.' };
    if (result.reason === 'ai_error') return { success: false, code: result.error.kind, message: result.error.message };
    return { success: false, message: 'Appointment not found.' };
  } catch (error) {
    console.error('Error retrying triage:', error);
    return { success: false, message: 'Could not run AI triage. Please try again.' };
  }
};

export const applySoapDraftAction = async (appointmentId: string) => {
  try {
    const { session } = await requireAssignedDoctor(appointmentId, { requireOpen: true });
    const doctorId = session.user.id;
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
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error applying AI SOAP draft:', error);
    return { success: false, message: 'Failed to apply AI SOAP draft.' };
  }
};

export const generatePatientSummaryNotes = async (appointmentId: string, draftData?: any) => {
  try {
    await requireAssignedDoctor(appointmentId, { requireOpen: true });
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

    // The patient summary is derived from the clinical record, so it needs saved notes to work from.
    if (!hasSavedClinicalNote(appointment.clinicalNote)) {
      return { success: false, message: 'Save the clinical notes first. The patient summary is written from them.' };
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
    const followUpNotes = draftData?.followUpNotes ?? followUp?.additionalNotes;

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

    const text = await generateText(prompt);

    await prisma.clinicalNote.update({
      where: { appointmentId },
      data: { patientSummaryNote: text },
    });

    return { success: true, summary: text };
  } catch (error) {
    const failure = authFailure(error) ?? aiFailure(error, 'patient summary');
    if (failure) return failure;
    console.error('Error generating patient summary notes:', error);
    return { success: false, message: 'Failed to generate patient summary notes.' };
  }
};

export const markAppointmentCompleteAction = async (appointmentId: string) => {
  try {
    const { session } = await requireAssignedDoctor(appointmentId, { requireOpen: true });
    const doctorId = session.user.id;
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
      include: { patient: { select: { name: true } } },
    });

    // ── Chat grace period: the conversation locks CHAT_LOCK_DAYS after completion ──
    const chatLocksAt = new Date();
    chatLocksAt.setDate(chatLocksAt.getDate() + CHAT_LOCK_DAYS);

    const conversation = await prisma.conversation.findFirst({
      where: { patientId: appointment.patientId, doctorId: appointment.doctorId ?? doctorId },
      select: { id: true, patientId: true },
    });

    if (conversation) {
      // Keep the active appointment linked so the chat section can read its status;
      // chatLocksAt is the real gate that locks the conversation after CHAT_LOCK_DAYS days.
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
          content: `This appointment has been marked as complete. Chat history for this appointment will be locked on ${chatLocksAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. You have ${CHAT_LOCK_DAYS} days to review your messages.`,
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
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error completing appointment:', error);
    return { success: false, message: 'Failed to complete appointment.' };
  }
};

/** Quick notice from the assigned doctor to the patient on an appointment. */
export const sendPatientNotificationAction = async ({ appointmentId, message }: { appointmentId: string; message: string }) => {
  try {
    const { session, appointment } = await requireAssignedDoctor(appointmentId);
    const text = message?.trim() ?? '';
    if (text.length === 0 || text.length > 1000) {
      return { success: false, message: 'Messages must be between 1 and 1000 characters.' };
    }
    const notif = await prisma.notification.create({
      data: {
        userId: appointment.patientId,
        type: 'MESSAGE',
        // The sender name comes from the session, so a notice can't impersonate someone else.
        title: `Message from ${formatDoctorName(session.user.name)}`,
        message: text,
        link: `/patient/appointment/${appointment.id}`,
      },
    });
    return { success: true, notification: notif };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error sending notification to patient:', error);
    return { success: false, message: 'Failed to send notification.' };
  }
};

export const requestUpdatedIntakeAction = async (appointmentId: string) => {
  try {
    const { appointment } = await requireAssignedDoctor(appointmentId, { requireOpen: true });
    const patientId = appointment.patientId;
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
        link: '/patient/appointment',
      },
    });

    revalidatePath(`/doctor/appointment/${appointmentId}`);
    return { success: true };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error requesting updated intake:', error);
    return { success: false, message: 'Failed to request updated intake.' };
  }
};


export const getDoctorProfile = async () => {
  try {
    const session = await getSessionWithRole('DOCTOR');
    if (!session) return null;
    const res = await prisma.doctorProfile.findUnique({
      where: {
        userId: session.user.id,
      },
    });
    return res;
  } catch (error) {
    console.log(error, 'error getting profile');
  }
};

export const getRecentPatients = async () => {
  try {
    const session = await getSessionWithRole('DOCTOR');
    if (!session) return [];
    const recentAppointments = await prisma.appointment.findMany({
      where: { doctorId: session.user.id },
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

export const getPatientFullRecord = async (patientId: string) => {
  try {
    const session = await requireRole('DOCTOR');
    const doctorId = session.user.id;

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

    // HIPAA access log: record every view of a full patient record.
    await recordAudit({
      actorId: doctorId,
      action: 'PATIENT_RECORD_VIEWED',
      entityType: 'PatientRecord',
      entityId: patientId,
      summary: 'Viewed full medical record',
    });

    return record;
  } catch (error) {
    console.error('Error fetching full medical record:', error);
    throw error;
  }
};

export const getDashboardAnalytics = async (timeRange: '7d' | '30d' | '6m' | '1y') => {
  try {
    const session = await getSessionWithRole('DOCTOR');
    if (!session || !['7d', '30d', '6m', '1y'].includes(timeRange)) return [];
    const doctorId = session.user.id;

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

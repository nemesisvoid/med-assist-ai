/**
 * AI triage for a submitted intake form.
 *
 * Plain server module (not 'use server'), so it is not exposed as a public
 * endpoint. It is run after the patient submits an intake, and by the assigned
 * doctor through `retryTriageAction`.
 *
 * If the AI is unavailable (quota, outage, bad output) the appointment still
 * moves forward for manual review and stays un-scored. It is never given a
 * default risk level, so an outage can't make a patient look low-risk.
 */

import * as z from 'zod';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/actions/notification.action';
import { AIServiceError, generateJson, logAIError, toAIServiceError } from '@/lib/ai';

const TriageSchema = z.object({
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  severityLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'SEVERE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  aiRiskSummary: z.string().trim().min(1),
  aiRecommendation: z.string().trim().min(1),
});

export type TriageResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'ai_error'; error: AIServiceError };

type RunTriageOptions = {
  /** Tell the assigned doctor when triage could not run (initial run only; a doctor retrying sees the error directly). */
  notifyDoctorOnFailure?: boolean;
};

export async function runTriage(appointmentId: string, { notifyDoctorOnFailure = true }: RunTriageOptions = {}): Promise<TriageResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      intakeForm: true,
      patient: { include: { patientProfile: true } },
    },
  });

  if (!appointment || !appointment.intakeForm) return { ok: false, reason: 'not_found' };

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

  let parsed: z.infer<typeof TriageSchema>;
  try {
    parsed = await generateJson(prompt, TriageSchema);
  } catch (error) {
    const aiError = toAIServiceError(error);
    logAIError(`triage for appointment ${appointmentId}`, aiError);

    // The intake is in, so don't leave the visit stuck waiting for AI; the doctor reviews it manually.
    await prisma.appointment.updateMany({
      where: { id: appointmentId, status: 'PENDING_INTAKE' },
      data: { status: 'READY_FOR_REVIEW' },
    });

    if (notifyDoctorOnFailure && appointment.doctorId) {
      const pain = appointment.intakeForm.painLevel ?? 'not given';
      await createNotification({
        userId: appointment.doctorId,
        type: 'APPOINTMENT',
        title: 'Intake received, AI triage unavailable',
        message: `${appointment.patient.name || 'A patient'} submitted their intake (pain ${pain}/10), but AI triage could not run. Please review the intake directly. You can retry the AI triage from the appointment page.`,
      });
    }

    return { ok: false, reason: 'ai_error', error: aiError };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
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

  return { ok: true };
}

/**
 * Extra prompt guidance for therapy (mental-health) sessions. Inserted into the
 * triage, SOAP-draft and patient-summary prompts when the assigned clinician's
 * provider type is THERAPIST; medical visits use the prompts unchanged.
 */

import type { ProviderType } from '@/generated/prisma/enums';

export const isTherapySession = (providerType?: ProviderType | null) => providerType === 'THERAPIST';

export const THERAPY_TRIAGE_GUIDANCE = `
--- THIS IS A MENTAL HEALTH / THERAPY SESSION ---
The clinician is a licensed therapist, not a physician. Assess the intake through a mental-health lens:
- Any mention of suicidal thoughts, self-harm, a plan or intent, harm to others, psychosis, or being unable to stay safe is HIGH risk and CRITICAL priority.
- Weigh the severity of distress, functional impairment (sleep, work, relationships, self-care), substance use, recent losses or crises, and available support.
- "Pain level" may describe emotional distress rather than physical pain.
- Recommendations are therapeutic next steps (e.g. safety planning, screening tools such as PHQ-9 or GAD-7, session frequency) and, where appropriate, referral to a physician or psychiatrist. Do not suggest medications or physical examinations.
`;

export const THERAPY_SOAP_GUIDANCE = `
--- THIS IS A THERAPY SESSION ---
Write a therapy progress note in SOAP format instead of a medical one:
1. Subjective: the client's own account: presenting concerns, mood, stressors, sleep, relationships, in their words where possible.
2. Objective: observable presentation (appearance, affect, speech, engagement), noting this is a telehealth session, plus any screening scores provided.
3. Assessment: impressions of progress and functioning, and an explicit risk assessment (self-harm, harm to others). Only write "no risk indicators reported" if the intake supports it.
4. Plan: therapeutic interventions (e.g. CBT or grounding techniques), between-session tasks, safety planning if indicated, next session timing and referrals.
Use non-diagnostic, person-centred language. Do not recommend medications.
`;

export const THERAPY_SUMMARY_GUIDANCE = `
This was a therapy session with a licensed therapist. Use gentle, non-stigmatising language and refer to the clinician as "your therapist", never "your doctor". If the plan mentions safety steps or crisis resources, state them clearly.
`;

export const VIDEO_VISIT_TRIAGE_GUIDANCE = `
--- VISIT TYPE: VIDEO CONSULTATION ---
The patient booked a video (remote) consultation. If the presentation likely needs a physical examination, tests or urgent in-person care, say so explicitly at the start of "aiRecommendation" (e.g. "Recommend converting to an in-person visit: ...").
`;

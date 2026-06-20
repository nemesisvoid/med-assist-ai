import { z } from "zod";

// Prescription row schema
export const prescriptionSchema = z.object({
    id: z.string(),
    medicationName: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().min(1, "Duration is required"),
});

// Full clinical notes schema with conditional follow-up validation
export const clinicalNotesSchema = z.object({
    // SOAP Notes
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),

    // Extended clinical fields
    diagnosis: z.string().optional(),
    treatmentPlan: z.string().optional(),
    patientSummaryNote: z.string().optional(),

    // Prescriptions
    prescriptions: z.array(prescriptionSchema).optional(),

    // Follow-up planning
    requiresFollowUp: z.boolean().default(false),
    followUpDate: z.string().optional(),
    followUpTime: z.string().optional(),
    followUpReason: z.string(),
    followUpNotes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.requiresFollowUp) {
        if (!data.followUpDate || data.followUpDate.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A recommended follow-up date is required.",
                path: ["followUpDate"],
            });
        }
        if (!data.followUpTime || data.followUpTime.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A recommended follow-up time is required.",
                path: ["followUpTime"],
            });
        }
        if (!data.followUpReason || data.followUpReason.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A reason for the follow-up is required.",
                path: ["followUpReason"],
            });
        }
    }
});

export const MessageFormSchema = z.object({
    senderId: z.string(),
    receiverId: z.string(),
    content: z.string().optional(),
    image: z.string().optional(),
});
export type ClinicalNotesFormValues = z.infer<typeof clinicalNotesSchema>;
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

"use client";

import { UseFormReturn } from "react-hook-form";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ClinicalNotesFormValues } from "@/schema/validators";

interface DoctorSoapNotesProps {
    form: UseFormReturn<ClinicalNotesFormValues>;
}

export default function DoctorSoapNotes({ form }: DoctorSoapNotesProps) {
    const fields = [
        {
            name: "subjective" as const,
            label: "Subjective (S)",
            hint: "Patient complaints & history",
            placeholder: "e.g., Patient describes constant chest tightness radiating to the back for 3 days...",
        },
        {
            name: "objective" as const,
            label: "Objective (O)",
            hint: "Physical stats, lab inputs",
            placeholder: "e.g., BP 130/85, HR 78 bpm. Lungs clear to auscultation. Pain reported as 7/10.",
        },
        {
            name: "assessment" as const,
            label: "Assessment (A)",
            hint: "Triage evaluation, status indicators",
            placeholder: "e.g., Moderate urgency chest symptoms, likely musculoskeletal but requires diagnostic tracking.",
        },
        {
            name: "plan" as const,
            label: "Plan (P)",
            hint: "Workup, consultations",
            placeholder: "e.g., Recommend diagnostic cardiac panels, schedule cardiological consultation within 48 hours.",
        },
        {
            name: "diagnosis" as const,
            label: "Formal Diagnosis",
            hint: "ICD codes & details",
            placeholder: "e.g., Primary hypertension, essential. Acute bronchitis.",
            accent: true,
        },
        {
            name: "treatmentPlan" as const,
            label: "Specific Treatment Plan",
            hint: "Immediate care steps",
            placeholder: "e.g., Begin Lisinopril 10mg daily. Rest and hydration.",
            accent: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
                <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: f }) => (
                        <FormItem className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {field.label}
                                </FormLabel>
                                <span className="text-[10px] text-slate-400">{field.hint}</span>
                            </div>
                            <FormControl>
                                <Textarea
                                    {...f}
                                    placeholder={field.placeholder}
                                    className={`min-h-32 text-xs font-semibold ${field.accent ? "border-indigo-100 focus-visible:ring-indigo-500/20" : "focus-visible:ring-indigo-500/20"}`}
                                />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                        </FormItem>
                    )}
                />
            ))}
        </div>
    );
}

"use client";
import { useTransition } from "react";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { CalendarPlus, Pill, Plus, Trash2, FileText, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"

import { ClinicalNotesFormValues } from "@/schema/validators";
import { generatePatientSummaryNotes } from "@/actions/doctor.action";
import { toast } from "sonner";

interface DoctorPlanningProps {
    form: UseFormReturn<ClinicalNotesFormValues>;
    appointmentId: string;
    isCompleted: boolean;
}

export default function DoctorPlanning({ form, appointmentId, isCompleted }: DoctorPlanningProps) {
    const [isGenerating, startGenerating] = useTransition();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "prescriptions",
    });

    const requiresFollowUp = form.watch("requiresFollowUp");

    const handleGenerateSummary = () => {
        startGenerating(async () => {
            toast.info("Generating patient summary...");
            const res = await generatePatientSummaryNotes(appointmentId);
            if (res?.success && res.summary) {
                form.setValue("patientSummaryNote", res.summary, { shouldDirty: true });
                toast.success("Patient summary generated successfully!");
            } else {
                toast.error(res?.message || "Failed to generate patient summary.");
            }
        });
    };
    return (
        <div className="space-y-6">
            {/* ── Prescriptions ── */}
            <Card className="shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200">
                <CardHeader className="bg-blue-50/30 border-b border-blue-100/50 p-4 flex flex-row justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Pill className="size-4 text-blue-600" />
                        <span className="text-sm font-bold uppercase tracking-wider">Prescriptions</span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-blue-200 text-blue-600 bg-white hover:bg-blue-50"
                        onClick={() =>
                            append({ id: crypto.randomUUID(), medicationName: "", dosage: "", frequency: "", duration: "" })
                        }
                    >
                        <Plus className="size-3.5" />
                        Add Medication
                    </Button>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    {fields.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 italic text-xs bg-slate-50/40 rounded-xl border border-dashed border-slate-200">
                            No prescriptions added yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50/30 items-end"
                                >
                                    <FormField
                                        control={form.control}
                                        name={`prescriptions.${index}.medicationName`}
                                        render={({ field: f }) => (
                                            <FormItem className="md:col-span-4 space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medication Name</FormLabel>
                                                <FormControl>
                                                    <Input {...f} placeholder="e.g. Amoxicillin" className="text-xs font-semibold h-8" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`prescriptions.${index}.dosage`}
                                        render={({ field: f }) => (
                                            <FormItem className="md:col-span-2 space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosage</FormLabel>
                                                <FormControl>
                                                    <Input {...f} placeholder="e.g. 500mg" className="text-xs font-semibold h-8" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`prescriptions.${index}.frequency`}
                                        render={({ field: f }) => (
                                            <FormItem className="md:col-span-3 space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</FormLabel>
                                                <FormControl>
                                                    <Input {...f} placeholder="e.g. Twice daily" className="text-xs font-semibold h-8" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`prescriptions.${index}.duration`}
                                        render={({ field: f }) => (
                                            <FormItem className="md:col-span-2 space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</FormLabel>
                                                <FormControl>
                                                    <Input {...f} placeholder="e.g. 7 days" className="text-xs font-semibold h-8" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="md:col-span-1 flex justify-end pb-0.5">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Follow-up Planning ── */}
            <Card className="shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200">
                <CardHeader className="bg-emerald-50/30 border-b border-emerald-100/50 p-4">
                    <div className="flex items-center gap-2 text-slate-800">
                        <CalendarPlus className="size-4 text-emerald-600" />
                        <span className="text-sm font-bold uppercase tracking-wider">Follow-up Planning</span>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    {/* Toggle */}
                    <FormField
                        control={form.control}
                        name="requiresFollowUp"
                        render={({ field }) => (
                            <FormItem className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60 rounded-xl p-3.5 border border-slate-100">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-bold text-slate-800 cursor-pointer">Require Follow-up Care?</FormLabel>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        Flags the case status as follow-up required.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FormControl>
                                        <Switch
                                            disabled={isCompleted}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-emerald-600"
                                        />
                                    </FormControl>
                                    <span className="text-xs font-semibold text-slate-700 min-w-16">
                                        {field.value ? "Enabled" : "Disabled"}
                                    </span>
                                </div>
                            </FormItem>
                        )}
                    />

                    {/* Conditional follow-up fields */}
                    {requiresFollowUp && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 animate-in fade-in-0 slide-in-from-top-2 duration-200">

                            <FormField
                                control={form.control}
                                name="followUpDate"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Recommended Date <span className="text-rose-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isCompleted}
                                                {...field}
                                                type="date"
                                                className="text-xs font-semibold border-slate-200 focus:border-emerald-400 h-9"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="followUpTime"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Recommended Time <span className="text-rose-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isCompleted}
                                                {...field}
                                                type="time"
                                                className="text-xs font-semibold border-slate-200 focus:border-emerald-400 h-9"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="followUpReason"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 md:col-span-2">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Reason for Follow-up <span className="text-rose-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={isCompleted}
                                                placeholder="e.g. Check blood pressure levels"
                                                className="text-xs font-semibold border-slate-200 focus:border-emerald-400 h-9"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="followUpNotes"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 md:col-span-2">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Additional Clinical Notes</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                disabled={isCompleted}
                                                placeholder="e.g. Ensure lab panels are completed prior to next checkup."
                                                className="min-h-16 text-xs font-medium focus-visible:ring-emerald-400/20 border-slate-200"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Patient Summary Notes ── */}
            <Card className="shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200">
                <CardHeader className="bg-indigo-50/30 border-b border-indigo-100/50 p-4 flex flex-row justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-800">
                        <FileText className="size-4 text-indigo-600" />
                        <div>
                            <span className="text-sm font-bold uppercase tracking-wider">Patient Summary Note</span>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                A plain-language summary of this appointment for the patient to read.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 shrink-0"
                        onClick={handleGenerateSummary}
                        disabled={isGenerating}
                    >
                        {isGenerating
                            ? <RefreshCw className="size-3.5 animate-spin" />
                            : <Sparkles className="size-3.5" />
                        }
                        {isGenerating ? "Generating..." : "Generate with AI"}
                    </Button>
                </CardHeader>
                <CardContent className="p-5">
                    <FormField
                        control={form.control}
                        name="patientSummaryNote"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Summary Content
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Write a plain-language summary of the appointment for the patient, or click 'Generate with AI' to auto-generate one from the clinical notes..."
                                        className="min-h-48 text-xs font-medium leading-relaxed focus-visible:ring-indigo-500/20 border-slate-200 resize-none"
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px]" />
                                {isGenerating && (
                                    <p className="text-[10px] text-indigo-500 font-medium flex items-center gap-1.5">
                                        <RefreshCw className="size-2.5 animate-spin" />
                                        AI is generating a patient-friendly summary from the clinical notes...
                                    </p>
                                )}
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { ClipboardList, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDoctorAppointmentById } from "@/actions/doctor.action";

interface DoctorIntakeSubmissionProps {
    appointment: NonNullable<Awaited<ReturnType<typeof getDoctorAppointmentById>>>;
    handleRequestIntake: () => void;
}

export default function DoctorIntakeSubmission({ appointment, handleRequestIntake }: DoctorIntakeSubmissionProps) {
    if (!appointment.intakeForm) {
        return (
            <Card className="shadow-sm border-dashed border-2 border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <AlertTriangle className="size-8 text-slate-400 mb-2" />
                <span className="text-sm font-semibold">No Intake Form Found</span>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    The patient has not completed their pre-appointment clinical intake questionnaire.
                </p>
                <Button size="sm" variant="outline" className="mt-4" onClick={handleRequestIntake}>
                    Send Intake Request
                </Button>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200 hover:shadow-md/5">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2 text-slate-800">
                    <ClipboardList className="size-4 text-blue-600" />
                    <span className="text-sm font-bold uppercase tracking-wider">Patient Intake Submission</span>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[10px] tracking-wide uppercase px-2">
                    Form Reviewed
                </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Chief Complaint */}
                    <div className="md:col-span-2 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chief Complaint</span>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                            "{appointment.intakeForm.chiefComplaint}"
                        </p>
                    </div>

                    {/* Pain Level Scale */}
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reported Pain Score</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        (appointment.intakeForm.painLevel || 0) >= 7 ? "bg-rose-500" :
                                            (appointment.intakeForm.painLevel || 0) >= 4 ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${(appointment.intakeForm.painLevel || 0) * 10}%` }}
                                />
                            </div>
                            <span className={cn(
                                "text-sm font-bold shrink-0",
                                (appointment.intakeForm.painLevel || 0) >= 7 ? "text-rose-600" :
                                    (appointment.intakeForm.painLevel || 0) >= 4 ? "text-amber-600" : "text-emerald-600"
                            )}>
                                {appointment.intakeForm.painLevel ?? 0}/10
                            </span>
                        </div>
                    </div>
                </div>

                {/* Symptoms, Allergies, Medications grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1 bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Symptoms</span>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                            {appointment.intakeForm.currentSymptoms}
                        </p>
                    </div>

                    <div className="space-y-1 bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Intake Allergies & Medications</span>
                        <div className="space-y-1 mt-1 text-xs">
                            <p className="font-semibold text-slate-700">
                                <span className="text-slate-400 font-bold text-[10px] uppercase block">Allergies:</span>
                                {appointment.intakeForm.allergies || "None declared"}
                            </p>
                            <p className="font-semibold text-slate-700">
                                <span className="text-slate-400 font-bold text-[10px] uppercase block">Medications:</span>
                                {appointment.intakeForm.medications || "None declared"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Additional Notes */}
                {appointment.intakeForm.additionalNotes && (
                    <div className="border-t border-slate-100 pt-3 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Patient Comments / Notes</span>
                        <p className="text-xs text-slate-500 italic leading-relaxed">
                            "{appointment.intakeForm.additionalNotes}"
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

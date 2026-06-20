"use client";

import { User } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAge } from "@/lib/utils";
import { getDoctorAppointmentById } from "@/actions/doctor.action";

interface DoctorPatientSummaryProps {
    appointment: NonNullable<Awaited<ReturnType<typeof getDoctorAppointmentById>>>;
}

export default function DoctorPatientSummary({ appointment }: DoctorPatientSummaryProps) {
    const patientProfile = appointment.patient.patientProfile;

    return (
        <Card className="shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200 hover:shadow-md/5">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                    <User className="size-4 text-indigo-600" />
                    <span className="text-sm font-bold uppercase tracking-wider">Patient Summary Profile</span>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100/50 pb-1">Personal Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                                <span className="text-sm font-semibold text-slate-700">{appointment.patient.name}</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                                <span className="text-sm font-medium text-slate-600 truncate block">{appointment.patient.email}</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Age</span>
                                <span className="text-sm font-semibold text-slate-700">{getAge(patientProfile?.dateOfBirth)} yrs</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                                <span className="text-sm font-semibold text-slate-700">{patientProfile?.gender || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                                <span className="text-sm font-semibold text-slate-700">{patientProfile?.bloodGroup || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Genotype</span>
                                <span className="text-sm font-semibold text-slate-700">{patientProfile?.genotype || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Medical Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100/50 pb-1">Clinical History</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Known Allergies</span>
                                {patientProfile?.allergies ? (
                                    <div className="flex flex-wrap gap-1">
                                        {patientProfile.allergies.split(",").map((allergy: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="bg-rose-50/50 text-rose-700 border-rose-100 text-[10px] font-semibold py-0.5 px-2 rounded-md">
                                                {allergy.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic font-medium">No allergies reported</span>
                                )}
                            </div>

                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Medications</span>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                                    {patientProfile?.medications || "No active medications recorded"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Medical History Summary</span>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                                    {patientProfile?.medicalHistory || "No past medical histories registered"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

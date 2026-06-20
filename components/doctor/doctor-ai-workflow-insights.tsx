"use client";

import { Brain, Info } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, getRiskLevelStyle } from "@/lib/utils";
import { getDoctorAppointmentById } from "@/actions/doctor.action";

interface DoctorAiWorkflowInsightsProps {
    appointment: NonNullable<Awaited<ReturnType<typeof getDoctorAppointmentById>>>;
    getPriorityStyle: (priority: string) => string;
}

export default function DoctorAiWorkflowInsights({ appointment, getPriorityStyle }: DoctorAiWorkflowInsightsProps) {
    if (!appointment.aiRiskSummary) return null;

    return (
        <Card className="border border-blue-100 bg-blue-50/20 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md/5">
            <CardHeader className="bg-blue-50/40 border-b border-blue-100/60 p-4 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2 text-slate-800">
                    <Brain className="size-4 text-blue-600" />
                    <span className="text-sm font-bold uppercase tracking-wider text-blue-900">AI Workflow Insights</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                    <Info className="size-3" />
                    AI-assisted workflow guidance
                </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block">Suggested Risk Level</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] font-bold py-0.5 rounded-full border uppercase tracking-wider", getRiskLevelStyle(appointment.riskLevel || "LOW"))}>
                                {appointment.riskLevel || "LOW"} Risk
                            </Badge>
                            <span className="text-xs text-slate-500">Matches clinical flags</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block">Suggested Workflow Priority</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] font-bold py-0.5 rounded-full border uppercase tracking-wider", getPriorityStyle(appointment.priority))} style={{ height: "auto" }}>
                                {appointment.priority}
                            </Badge>
                            <span className="text-xs text-slate-500">Based on acute pain index</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-blue-100/50">
                    <div>
                        <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block mb-1">Triage Priority Risk Summary</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {appointment.aiRiskSummary}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block mb-1">Actionable Recommendations</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {appointment.aiRecommendation}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

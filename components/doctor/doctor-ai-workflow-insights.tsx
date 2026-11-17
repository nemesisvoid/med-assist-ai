"use client";

import { Brain, Info, RefreshCw, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRiskLabel, getRiskLevelStyle } from "@/lib/utils";
import { getDoctorAppointmentById } from "@/actions/doctor.action";

interface DoctorAiWorkflowInsightsProps {
    appointment: NonNullable<Awaited<ReturnType<typeof getDoctorAppointmentById>>>;
    getPriorityStyle: (priority: string) => string;
    onRetryTriage: () => void;
    isRetrying: boolean;
}

export default function DoctorAiWorkflowInsights({ appointment, getPriorityStyle, onRetryTriage, isRetrying }: DoctorAiWorkflowInsightsProps) {
    if (!appointment.aiRiskSummary) {
        const isOpen = appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED";
        if (!appointment.intakeForm || !isOpen) return null;

        // Intake submitted but never scored: AI was unavailable (quota, outage) or is still running.
        return (
            <Card className="border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                            <TriangleAlert className="size-4 text-amber-700" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">AI triage not available</p>
                            <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                                The AI couldn&apos;t assess this intake, so the risk level is not assessed and the priority is still the default.
                                Review the intake above directly. You can retry the AI triage at any time.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRetryTriage}
                        disabled={isRetrying}
                        className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 cursor-pointer">
                        <RefreshCw className={cn("size-3.5", isRetrying && "animate-spin")} aria-hidden />
                        {isRetrying ? "Running…" : "Retry AI triage"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

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
                            <Badge variant="outline" className={cn("text-[10px] font-bold py-0.5 rounded-full border uppercase tracking-wider", getRiskLevelStyle(appointment.riskLevel))}>
                                {formatRiskLabel(appointment.riskLevel)}
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

'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Brain,
  Save,
  CheckCircle,
  Calendar,
  Clock,
  Activity,
  RefreshCw,
  Send,
  Bell,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  getDoctorAppointmentById,
  saveClinicalNoteAction,
  generateSoapDraftAction,
  markAppointmentCompleteAction,
  sendPatientNotificationAction,
  requestUpdatedIntakeAction,
  applySoapDraftAction,
} from '@/actions/doctor.action';
import { cn, formatEnums, getAppointmentStatusStyle, getPriorityStyle, getRiskLevelStyle } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// Sub-components
import DoctorPatientSummary from './doctor-patient-summary';
import DoctorIntakeSubmission from './doctor-intake-submission';
import DoctorAiWorkflowInsights from './doctor-ai-workflow-insights';
import DoctorSoapNotes from './doctor-soap-notes';
import DoctorPlanning from './doctor-planning';

// Validators
import { clinicalNotesSchema, ClinicalNotesFormValues } from '@/schema/validators';

type DoctorAppointmentDetailsProps = {
  appointment: NonNullable<Awaited<ReturnType<typeof getDoctorAppointmentById>>>;
  doctorUser: { id: string; name: string; email: string };
};

export default function DoctorAppointmentDetails({ appointment: initialAppointment, doctorUser }: DoctorAppointmentDetailsProps) {
  const [appointment, setAppointment] = useState(initialAppointment);
  const [activeTab, setActiveTab] = useState('soap');
  const [patientMessage, setPatientMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const clinicalNote = appointment.clinicalNote as any;
  const followUp = (appointment as any).followUp;
  const isCompleted = appointment.status === 'COMPLETED';

  // ── Single form instance ──────────────────────────────────────────────────
  const form = useForm<ClinicalNotesFormValues>({
    resolver: zodResolver(clinicalNotesSchema),
    defaultValues: {
      subjective: clinicalNote?.subjective || '',
      objective: clinicalNote?.objective || '',
      assessment: clinicalNote?.assessment || '',
      plan: clinicalNote?.plan || '',
      diagnosis: clinicalNote?.diagnosis || '',
      treatmentPlan: clinicalNote?.treatmentPlan || '',
      patientSummaryNote: clinicalNote?.patientSummaryNote || '',
      prescriptions: clinicalNote?.prescriptions || [],
      requiresFollowUp: appointment.requiresFollowUp || false,
      followUpDate: followUp?.recommendedDate ? new Date(followUp.recommendedDate).toISOString().split('T')[0] : '',
      followUpTime: followUp?.recommendedDate ? new Date(followUp.recommendedDate).toTimeString().slice(0, 5) : '',
      followUpReason: followUp?.reason || '',
      followUpNotes: followUp?.additionalNotes || '',
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshAppointmentState = async () => {
    const fresh = await getDoctorAppointmentById(appointment.id);
    if (fresh) {
      setAppointment(fresh);
      return fresh;
    }
    return null;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveNotes = form.handleSubmit(values => {
    startTransition(async () => {
      const res = await saveClinicalNoteAction(appointment.id, doctorUser.id, values);

      if (res.success) {
        toast.success('Clinical notes saved successfully');
        const fresh = await refreshAppointmentState();
        // Re-sync form so prescriptions (and other server data) stay populated
        if (fresh) {
          const freshNote = (fresh.clinicalNote as any);
          const freshFollowUp = (fresh as any).followUp;
          form.reset({
            subjective: freshNote?.subjective || '',
            objective: freshNote?.objective || '',
            assessment: freshNote?.assessment || '',
            plan: freshNote?.plan || '',
            diagnosis: freshNote?.diagnosis || '',
            treatmentPlan: freshNote?.treatmentPlan || '',
            patientSummaryNote: freshNote?.patientSummaryNote || '',
            prescriptions: freshNote?.prescriptions || [],
            requiresFollowUp: fresh.requiresFollowUp || false,
            followUpDate: freshFollowUp?.recommendedDate ? new Date(freshFollowUp.recommendedDate).toISOString().split('T')[0] : '',
            followUpTime: freshFollowUp?.recommendedDate ? new Date(freshFollowUp.recommendedDate).toTimeString().slice(0, 5) : '',
            followUpReason: freshFollowUp?.reason || '',
            followUpNotes: freshFollowUp?.additionalNotes || '',
          });
        }
      } else {
        toast.error('Failed to save clinical notes');
      }
    });
  });

  const handleGenerateAIDraft = () => {
    startTransition(async () => {
      toast.info('Generating AI SOAP draft based on patient intake...');
      const res = await generateSoapDraftAction(appointment.id);
      if (res.success && res.draft) {
        toast.success('AI SOAP draft generated!');
        await refreshAppointmentState();
        setActiveTab('ai-draft');
      } else {
        toast.error(res.message || 'Failed to generate AI SOAP draft');
      }
    });
  };

  const handleApplyAIDraft = () => {
    startTransition(async () => {
      const res = await applySoapDraftAction(appointment.id, doctorUser.id);
      if (res.success) {
        toast.success('AI Draft applied to SOAP notes!');
        await refreshAppointmentState();
        setActiveTab('soap');
      } else {
        toast.error(res.message || 'Failed to apply AI draft');
      }
    });
  };

  const handleMarkComplete = () => {
    setShowCompleteDialog(true);
  };

  const confirmMarkComplete = () => {
    setShowCompleteDialog(false);
    startTransition(async () => {
      const res = await markAppointmentCompleteAction(appointment.id, doctorUser.id);
      if (res.success) {
        toast.success('Appointment completed and workspace locked');
        await refreshAppointmentState();
      } else {
        toast.error('Failed to finalize appointment');
      }
    });
  };

  const handleSendMessage = () => {
    if (!patientMessage.trim()) return;
    startTransition(async () => {
      const res = await sendPatientNotificationAction({
        patientId: appointment.patientId,
        title: `Message from Dr. ${doctorUser.name}`,
        message: patientMessage,
      });
      if (res.success) {
        toast.success('Notification sent to patient');
        setPatientMessage('');
      } else {
        toast.error('Failed to dispatch notification');
      }
    });
  };

  const handleRequestIntake = () => {
    startTransition(async () => {
      const res = await requestUpdatedIntakeAction(appointment.id, appointment.patientId);
      if (res.success) {
        toast.success('Updated intake request sent to patient');
        await refreshAppointmentState();
      } else {
        toast.error('Failed to request update');
      }
    });
  };

  const patientProfile = appointment.patient.patientProfile;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Confirm Complete Dialog ─────────────────────────────────────── */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className='max-w-xl!' showCloseButton={false}>
          <DialogHeader>
            <div className='flex items-center gap-3 mb-1'>
              <div className='p-2.5 bg-amber-100 rounded-xl'>
                <AlertTriangle className='size-5 text-amber-600' />
              </div>
              <DialogTitle className='text-base font-bold text-slate-800'>
                Mark Appointment as Complete?
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-slate-500 leading-relaxed'>
              This action is <span className='font-semibold text-rose-600 uppercase'>irreversible</span>, once confirmed:
            </DialogDescription>
          </DialogHeader>
          <ul className='space-y-2 text-xs text-slate-600 font-medium pl-1'>
            <li className='flex items-start gap-1'>
              <Lock className='size-3.5 text-slate-400 mt-0.5 shrink-0' />
              The clinical workspace will be <span className='font-bold text-slate-800'>permanently locked</span> — no further edits can be made.
            </li>
            <li className='flex items-start gap-2'>
              <CheckCircle2 className='size-3.5 text-emerald-500 mt-0.5 shrink-0' />
              The appointment will be marked <span className='font-bold text-emerald-700'>COMPLETED</span> and the patient will be notified.
            </li>
            <li className='flex items-start gap-2'>
              <AlertTriangle className='size-3.5 text-amber-500 mt-0.5 shrink-0' />
              Ensure all clinical notes, prescriptions, and follow-up details are finalised before proceeding.
            </li>
          </ul>
          <DialogFooter className='mt-2'>
            <DialogClose render={<Button variant='outline' size='sm' className='cursor-pointer' />}>
              Cancel — Keep Editing
            </DialogClose>
            <Button
              size='sm'
              className='bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md'
              onClick={confirmMarkComplete}
              disabled={isPending}
            >
              <CheckCircle2 className='size-3.5' />
              Yes, Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form
          onSubmit={handleSaveNotes}
          className='space-y-6'>
          {/* 1. STICKY HEADER */}
          <div className='sticky top-0 z-40 bg-white/80 backdrop-blur-md border border-slate-100 rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm mb-6 transition-all'>
            <div className='flex items-center gap-4 min-w-0'>
              <Avatar
                className='size-12 border border-slate-200 shadow-sm'
                size='lg'>
                <AvatarImage
                  src={patientProfile?.imageUrl || ''}
                  alt={appointment.patient.name}
                />
                <AvatarFallback className='bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-700 font-bold text-base'>
                  {appointment.patient.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h1 className='text-lg font-bold text-slate-800 tracking-tight truncate'>{appointment.patient.name}</h1>
                  <span className='text-xs text-slate-400 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase'>
                    {patientProfile?.medicalRecordNumber || 'MRN-PENDING'}
                  </span>
                </div>

                <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5'>
                  <span className='text-xs text-slate-500 font-medium flex items-center gap-1'>
                    <Calendar className='size-3 text-slate-400' />
                    {new Date(appointment.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className='text-xs text-slate-500 font-medium flex items-center gap-1'>
                    <Clock className='size-3 text-slate-400' />
                    {appointment.scheduledTime || 'N/A'}
                  </span>
                  <div className='flex items-center gap-1.5 ml-1'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-bold px-2 py-0 h-4.5 rounded-full border shadow-sm uppercase tracking-wider',
                        getAppointmentStatusStyle(appointment.status),
                      )}>
                      {formatEnums(appointment.status)}
                    </Badge>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-bold px-2 py-0 h-4.5 rounded-full border shadow-sm uppercase tracking-wider',
                        getPriorityStyle(appointment.priority),
                      )}>
                      {appointment.priority} Priority
                    </Badge>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-bold px-2 py-0 h-4.5 rounded-full border shadow-sm uppercase tracking-wider',
                        getRiskLevelStyle(appointment.riskLevel || 'LOW'),
                      )}>
                      {appointment.riskLevel || 'LOW'} Risk
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2 w-full md:w-auto'>
              {!isCompleted && <Button
                type='button'
                variant='outline'
                size='sm'
                className='flex-1 md:flex-none border-blue-200 text-blue-600 bg-blue-50/20 hover:bg-blue-50/50 hover:text-blue-700 transition-colors shadow-sm cursor-pointer'
                onClick={handleGenerateAIDraft}
                disabled={isPending || !appointment.intakeForm}>
                {isPending ? <RefreshCw className='size-3.5 animate-spin' /> : <Brain className='size-3.5' />}
                Generate AI Draft
              </Button>}

              {!isCompleted && <Button
                type='submit'
                variant='outline'
                size='sm'
                className='flex-1 md:flex-none border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer'
                disabled={isPending}>
                <Save className='size-3.5' />
                Save Clinical Notes
              </Button>}

              <Button
                type='button'
                variant='default'
                size='sm'
                className={cn(
                  'flex-1 md:flex-none transition-colors shadow-md cursor-pointer',
                  isCompleted
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white',
                )}
                onClick={handleMarkComplete}
                disabled={isPending || isCompleted}>
                {isCompleted ? <Lock className='size-3.5' /> : <CheckCircle className='size-3.5' />}
                {isCompleted ? 'Appointment Locked' : 'Mark Complete'}
              </Button>
            </div>
          </div>

          {/* COMPLETED BANNER */}
          {isCompleted && (
            <div className='flex items-center gap-3 bg-slate-800 text-white rounded-xl px-5 py-3.5 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-300'>
              <Lock className='size-4 text-slate-300 shrink-0' />
              <div>
                <p className='text-xs font-bold tracking-wide'>Clinical Workspace Locked</p>
                <p className='text-[10px] text-slate-400 font-medium mt-0.5'>This appointment has been completed. All fields are read-only.</p>
              </div>
            </div>
          )}

          {/* MAIN GRID */}
          <fieldset disabled={isCompleted} className='contents'>
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
              <div className='lg:col-span-8 space-y-6'>
                {/* Patient Summary */}
                <DoctorPatientSummary appointment={appointment} />

                {/* Intake Submission */}
                <DoctorIntakeSubmission
                  appointment={appointment}
                  handleRequestIntake={handleRequestIntake}
                />

                {/* AI Workflow Insights */}
                <DoctorAiWorkflowInsights
                  appointment={appointment}
                  getPriorityStyle={getPriorityStyle}
                />

                {/* Clinical Documentation Workspace */}
                <Card className='shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200'>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className='w-full'>
                    <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2'>
                      <TabsList
                        className='bg-slate-200/50'
                        variant='default'>
                        <TabsTrigger
                          value='soap'
                          className='cursor-pointer'>
                          <FileText className='size-3' />
                          SOAP Notes
                        </TabsTrigger>
                        <TabsTrigger
                          value='ai-draft'
                          className='cursor-pointer'>
                          <Brain className='size-3 text-indigo-500' />
                          AI Draft
                        </TabsTrigger>
                        <TabsTrigger
                          value='timeline'
                          className='cursor-pointer'>
                          <Activity className='size-3' />
                          Activity Timeline
                        </TabsTrigger>
                      </TabsList>

                      {activeTab === 'soap' && (
                        <Button
                          type='submit'
                          variant='outline'
                          size='xs'
                          className='border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-sm cursor-pointer'
                          disabled={isPending}>
                          <Save className='size-3' />
                          Save Form
                        </Button>
                      )}
                    </div>

                    {/* SOAP Notes Tab */}
                    <TabsContent
                      value='soap'
                      className='p-5 space-y-4'>
                      <DoctorSoapNotes form={form} />
                    </TabsContent>

                    {/* AI Draft Tab */}
                    <TabsContent
                      value='ai-draft'
                      className='p-5'>
                      {appointment.aiSoapSubjective ? (
                        <div className='space-y-4'>
                          <div className='flex items-center justify-between border border-indigo-100 bg-indigo-50/20 rounded-xl p-3.5 shadow-sm'>
                            <div className='flex items-start gap-3'>
                              <div className='p-2 bg-indigo-100 rounded-lg text-indigo-600 mt-0.5'>
                                <Brain className='size-4' />
                              </div>
                              <div>
                                <h4 className='text-xs font-bold text-indigo-950 uppercase tracking-wider'>AI Draft Ready for Review</h4>
                                <p className='text-[11px] text-indigo-600/80 font-medium'>
                                  Generate drafts to pre-populate. Refine clinical decisions on the fly.
                                </p>
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Button
                                type='button'
                                size='xs'
                                variant='outline'
                                className='bg-white hover:bg-slate-50 border-slate-200 cursor-pointer text-slate-700'
                                onClick={handleGenerateAIDraft}>
                                <RefreshCw className='size-3' /> Regenerate
                              </Button>
                              <Button
                                type='button'
                                size='xs'
                                className='bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                                onClick={handleApplyAIDraft}>
                                <CheckCircle className='size-3' /> Apply Draft to SOAP
                              </Button>
                            </div>
                          </div>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {[
                              { label: 'Subjective Draft', value: appointment.aiSoapSubjective },
                              { label: 'Objective Draft', value: appointment.aiSoapObjective },
                              { label: 'Assessment Draft', value: appointment.aiSoapAssessment },
                              { label: 'Plan Draft', value: appointment.aiSoapPlan },
                            ].map(({ label, value }) => (
                              <div
                                key={label}
                                className='border border-slate-100 rounded-xl p-3.5 bg-slate-50/40'>
                                <span className='text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1'>{label}</span>
                                <p className='text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-line'>{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col items-center justify-center py-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/20'>
                          <Brain className='size-10 text-slate-300 animate-pulse mb-3' />
                          <h4 className='text-xs font-semibold text-slate-700'>No Draft Generated</h4>
                          <p className='text-xs text-slate-400 mt-1 max-w-sm px-4'>
                            Create an AI SOAP draft automatically using intake complaints, patient history and allergies.
                          </p>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            className='mt-4 border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 cursor-pointer shadow-sm'
                            onClick={handleGenerateAIDraft}>
                            Generate SOAP Draft
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Activity Timeline Tab */}
                    <TabsContent
                      value='timeline'
                      className='p-5'>
                      <div className='relative border-l-2 border-slate-100 pl-6 space-y-6 ml-3 py-2'>
                        <div className='relative'>
                          <div className='absolute -left-9 top-0.5 size-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm'>
                            <Calendar className='size-3' />
                          </div>
                          <div>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-bold text-slate-800'>Appointment Scheduled</span>
                              <span className='text-[10px] text-slate-400 font-medium'>
                                {formatDistanceToNow(new Date(appointment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className='text-[11px] text-slate-500 font-medium mt-0.5'>
                              Appointment of type {appointment.appointmentType} created with Dr. {appointment.doctor?.name || 'Unassigned'}.
                            </p>
                          </div>
                        </div>

                        {appointment.intakeForm && (
                          <div className='relative'>
                            <div className='absolute -left-9 top-0.5 size-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm'>
                              <ClipboardList className='size-3' />
                            </div>
                            <div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs font-bold text-slate-800'>Intake Form Submitted</span>
                                <span className='text-[10px] text-slate-400 font-medium'>
                                  {formatDistanceToNow(new Date(appointment.intakeForm.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className='text-[11px] text-slate-500 font-medium mt-0.5'>
                                Patient reported pain index {appointment.intakeForm.painLevel ?? 0}/10.
                              </p>
                            </div>
                          </div>
                        )}

                        {appointment.status === 'COMPLETED' && (
                          <div className='relative'>
                            <div className='absolute -left-9 top-0.5 size-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm'>
                              <CheckCircle2 className='size-3 animate-pulse' />
                            </div>
                            <div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs font-bold text-emerald-800'>Appointment Completed</span>
                                <span className='text-[10px] text-emerald-500 font-bold uppercase'>Finalized</span>
                              </div>
                              <p className='text-[11px] text-slate-500 font-medium mt-0.5'>Clinical workspace locked.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>

                {/* Follow-up & Planning */}
                <DoctorPlanning
                  form={form}
                  isCompleted={isCompleted}
                  appointmentId={appointment.id}
                />
              </div>

              {/* RIGHT SIDEBAR */}
              <div className='lg:col-span-4 space-y-6'>
                <Card className='shadow-sm border-slate-100 bg-white overflow-hidden transition-all duration-200'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 p-4'>
                    <div className='flex items-center gap-2 text-slate-800'>
                      <Bell className='size-4 text-indigo-600' />
                      <span className='text-sm font-bold uppercase tracking-wider'>Clinical Workspace Inbox</span>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-5 p-4'>
                    <div className='space-y-3'>
                      <h4 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Provider Quick Triggers</h4>
                      <div className='space-y-3'>
                        <div className='space-y-1.5'>
                          <Label className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Quick Patient Notice</Label>
                          <div className='flex gap-2'>
                            <input
                              type='text'
                              placeholder='Type direct message...'
                              value={patientMessage}
                              onChange={e => setPatientMessage(e.target.value)}
                              className='flex-1 text-xs font-semibold bg-input/10 border border-input rounded-md px-2 py-1 outline-none focus:border-ring focus:ring-1 focus:ring-ring'
                            />
                            <Button
                              type='button'
                              size='xs'
                              className='bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                              onClick={handleSendMessage}
                              disabled={isPending}>
                              <Send className='size-3' />
                            </Button>
                          </div>
                        </div>

                        <div className='pt-1'>
                          <Button
                            type='button'
                            variant='outline'
                            size='xs'
                            className='w-full border-amber-200 text-amber-700 bg-amber-50/20 hover:bg-amber-50 hover:text-amber-800 transition-colors shadow-sm cursor-pointer py-4 text-[10px]'
                            onClick={handleRequestIntake}
                            disabled={isPending}>
                            <RefreshCw className='size-3' />
                            Request Updated Intake Form
                          </Button>
                        </div>

                        <div className='rounded-lg bg-slate-50 p-3 border border-slate-100 text-[10px] text-slate-500 leading-relaxed font-semibold'>
                          <div className='flex gap-1.5 items-start text-indigo-700 uppercase tracking-wider mb-1 font-bold'>
                            <ShieldCheck className='size-3.5 shrink-0' />
                            Clinical Guardrails
                          </div>
                          Generative draft SOAP recommendations are provided as suggestions. Clinical judgment remains the final standard of care.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </fieldset>
        </form>
      </Form>
    </>
  );
}

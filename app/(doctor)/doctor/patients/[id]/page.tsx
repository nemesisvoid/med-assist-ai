import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { getLoggedInUser } from '@/lib/get-user';
import { getPatientFullRecord } from '@/actions/doctor.action';
import { getAge } from '@/lib/utils';
import { 
  ArrowLeft, 
  User, 
  Activity, 
  FileText, 
  Pill, 
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'DOCTOR') return redirect('/auth/login');

  let patientRecord;
  try {
    console.log("Fetching patient record for:", id);
    patientRecord = await getPatientFullRecord(id, session.user.id);
  } catch (error) {
    console.error("Error in PatientRecordPage:", error);
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 max-w-md">
          You are not authorized to view this patient's medical record. You can only view records for patients you have an appointment with.
        </p>
        <Link href="/doctor/dashboard" className="mt-8">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!patientRecord) {
    return redirect('/doctor/dashboard');
  }

  const profile = patientRecord.patientProfile;
  const appointments = patientRecord.patientAppointments;
  
  // Filter appointments that resulted in prescriptions
  const appointmentsWithPrescriptions = appointments.filter(
    (appt: any) => appt.clinicalNote?.prescriptions?.length > 0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Back Button */}
      <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Patient Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 md:py-12 relative flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
            <AvatarImage src={patientRecord.image || undefined} alt={patientRecord.name} />
            <AvatarFallback className="bg-white text-blue-600 text-4xl font-bold">
              {patientRecord.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left text-white mt-2">
            <h1 className="text-3xl font-extrabold mb-2">{patientRecord.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center text-blue-100 font-medium">
              <span>{profile?.gender || 'Unknown Gender'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              <span>{profile?.dateOfBirth ? `${getAge(profile.dateOfBirth)} years old` : 'Age N/A'}</span>
              {profile?.bloodGroup && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
                  <Badge variant="outline" className="text-white border-white/20 bg-white/10">
                    Blood: {profile.bloodGroup}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="md:ml-auto flex gap-3 mt-4 md:mt-0">
            <Link href={`/doctor/messages?userId=${patientRecord.id}`}>
              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                Message Patient
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          <div className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Allergies
            </p>
            <p className="text-sm font-medium text-slate-800">
              {profile?.allergies || 'No known allergies reported.'}
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" /> Medical History
            </p>
            <p className="text-sm font-medium text-slate-800">
              {profile?.medicalHistory || 'No significant history reported.'}
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Pill className="w-4 h-4 text-blue-500" /> Current Medications
            </p>
            <p className="text-sm font-medium text-slate-800">
              {profile?.medications || 'Not taking any medications.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="timeline">Care Timeline</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescription History</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">Past Appointments & Clinical Notes</h2>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-100">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No past appointments found.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {appointments.map((appt: any, index: number) => (
                <div key={appt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Timeline Node */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {appt.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-2">
                          {format(new Date(appt.scheduledAt), 'MMMM d, yyyy')}
                        </span>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{appt.appointmentType}</h3>
                          <Link href={`/doctor/appointment/${appt.id}`} className="text-blue-500 hover:text-blue-600" title="View Appointment Details">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Dr. {appt.doctor?.name} ({appt.doctor?.doctorProfile?.specialty})</p>
                      </div>
                      <Badge variant={appt.status === 'COMPLETED' ? 'default' : 'secondary'} className={appt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}>
                        {appt.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {appt.appointmentReason && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</p>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{appt.appointmentReason}</p>
                        </div>
                      )}

                      {appt.clinicalNote ? (
                        <div className="border-t border-slate-100 pt-4 mt-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinical Notes (SOAP)</p>
                          <div className="space-y-3">
                            {appt.clinicalNote.diagnosis && (
                              <p className="text-sm"><span className="font-semibold text-slate-800">Diagnosis:</span> <span className="text-slate-600">{appt.clinicalNote.diagnosis}</span></p>
                            )}
                            <p className="text-sm"><span className="font-semibold text-slate-800">Assessment:</span> <span className="text-slate-600">{appt.clinicalNote.assessment || 'N/A'}</span></p>
                            <p className="text-sm"><span className="font-semibold text-slate-800">Plan:</span> <span className="text-slate-600">{appt.clinicalNote.plan || 'N/A'}</span></p>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-slate-100 pt-4 mt-4">
                          <p className="text-xs text-slate-400 italic">No clinical notes recorded for this visit.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">Prescription History</h2>
            </div>
            
            {appointmentsWithPrescriptions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 font-medium">No prescriptions found in medical history.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointmentsWithPrescriptions.map((appt: any) => (
                  <div key={appt.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            Prescribed on {format(new Date(appt.scheduledAt), 'MMMM d, yyyy')}
                          </h3>
                          <Link href={`/doctor/appointment/${appt.id}`} className="text-blue-500 hover:text-blue-600" title="View Appointment Details">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">By Dr. {appt.doctor?.name}</p>
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        {appt.appointmentType}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {appt.clinicalNote.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              {rx.medicationName}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              <span className="font-medium text-slate-600">Dosage:</span> {rx.dosage} • <span className="font-medium text-slate-600">Frequency:</span> {rx.frequency}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {rx.duration}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

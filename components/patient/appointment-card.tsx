import { CalendarIcon, FileCheck, AlertCircle, Clock, ClockIcon } from 'lucide-react';
import PatientIntakeForm from '@/components/patient/patient-intake-form';

type AppointmentCardProps = {
  appointmentId: string;
  doctor?: string | null | undefined;
  scheduledDate: Date;
  scheduledTime: string | null;
  date: Date;
  isPatient: 'PATIENT' | 'DOCTOR';
  title?: string;
  desc?: string;
  intakeFormId?: string | null;
};

const AppointmentCard = ({
  appointmentId,
  doctor,
  date,
  isPatient,
  title,
  desc,
  intakeFormId,
  scheduledDate,
  scheduledTime,
}: AppointmentCardProps) => {
  return (
    <div className='p-4 hover:bg-slate-50/80 transition-all border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
      <div className='flex items-start gap-3.5'>
        {/* Date Accent Indicator Icon */}
        <div className={`p-2.5 rounded-xl shrink-0 ${isPatient === 'PATIENT' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <CalendarIcon size={18} />
        </div>

        <div className='space-y-1 max-w-md'>
          {/* Main Context Header */}
          <span className='text-[11px] font-bold text-slate-400 uppercase tracking-wider block'>
            {isPatient ? 'Assigned Practitioner' : 'Scheduled Patient'}
          </span>
          <h3 className='text-sm font-bold text-slate-800 leading-tight'>{doctor}</h3>

          {/* Metadata Rows */}
          {title && <p className='text-xs font-semibold text-slate-600'>{title}</p>}
          {desc && <p className='text-xs text-slate-500 line-clamp-1'>{desc}</p>}

          {/* Consolidated Timestamp */}
          <div className='flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5'>
            <Clock
              size={13}
              className='text-slate-400'
            />
            <span>{new Date(scheduledDate).toDateString()}</span>
            <span className='text-slate-300'>•</span>
            <span>{scheduledTime}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Conditional Interactive Actions / Badges Area */}
      <div className='sm:self-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex items-center justify-end'>
        {isPatient ? (
          /* PATIENT VIEW FLOW */
          intakeFormId ? (
            <div className='flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg'>
              <FileCheck size={14} />
              Intake Completed
            </div>
          ) : (
            <div className='flex flex-col sm:items-end gap-2 w-full sm:w-auto'>
              <div className='flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit'>
                <AlertCircle size={12} />
                Intake Action Required
              </div>
              <PatientIntakeForm appointmentId={appointmentId} />
            </div>
          )
        ) : /* DOCTOR VIEW FLOW */
        intakeFormId ? (
          <button className='text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100/50'>
            Review Clinical Intake
          </button>
        ) : (
          <div className='flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100'>
            <ClockIcon size={14} />
            Awaiting Patient Intake
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;

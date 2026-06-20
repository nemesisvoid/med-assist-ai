import { isToday, isTomorrow } from 'date-fns';
import { Button } from '../ui/button';
import { AppointmentStatus, RiskLevel } from '@/generated/prisma/enums';
import { formatEnums, cn, getAppointmentStatusStyle, getRiskLevelStyle } from '@/lib/utils';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, UserIcon, FileWarningIcon, ArrowRightIcon } from 'lucide-react';

type DoctorAppointmentCardProps = {
  data: {
    appointmentId: string;
    appointmentType: string;
    appointmentReason: string;
    patientName: string;
    scheduledTime: string | null;
    scheduledDate: Date;
    title?: string | null;
    intakeFormId: string | undefined;
    status: AppointmentStatus;
    riskLevel: RiskLevel;
  };
};

const DoctorAppointmentCard = ({ data }: DoctorAppointmentCardProps) => {
  const isScheduledToday = isToday(new Date(data.scheduledDate));
  const isScheduledTomorrow = isTomorrow(new Date(data.scheduledDate));

  return (
    <div className='group p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden'>
      {/* Visual Indicator Line for Risk Level */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1.5 transition-colors',
        data.riskLevel === 'HIGH' ? 'bg-rose-500' : data.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
      )} />

      <div className='flex items-start gap-4 flex-1 min-w-0 pl-1.5'>
        {/* Patient Initial Icon / Avatar Accent */}
        <div className='w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-500 group-hover:bg-blue-50/50 group-hover:text-blue-600 transition-colors duration-300'>
          <UserIcon className='w-5 h-5' />
        </div>

        <div className='space-y-1.5 flex-1 min-w-0'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h4 className='text-sm font-bold text-slate-800 tracking-tight truncate'>
              {data.patientName || 'Dave'}
            </h4>
            <span className='text-slate-300 text-xs'>•</span>
            <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
              {data.appointmentType}
            </p>
          </div>
          <p className='text-xs text-slate-550 line-clamp-1 leading-relaxed'>
            {data.appointmentReason}
          </p>

          {/* Schedule Row */}
          <div className='flex items-center gap-3.5 text-xs text-slate-400 font-medium pt-1'>
            <div className='flex items-center gap-1 shrink-0'>
              <CalendarIcon className='w-3.5 h-3.5 text-slate-400' />
              <span>
                {isScheduledToday
                  ? 'Today'
                  : isScheduledTomorrow
                  ? 'Tomorrow'
                  : new Date(data.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {data.scheduledTime && (
              <>
                <span className='text-slate-200'>|</span>
                <div className='flex items-center gap-1 shrink-0'>
                  <ClockIcon className='w-3.5 h-3.5 text-slate-400' />
                  <span>{data.scheduledTime}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badges & Actions Workspace */}
      <div className='flex flex-wrap items-center gap-3.5 shrink-0 self-end md:self-center pl-1.5 md:pl-0 border-t md:border-t-0 border-slate-50 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end'>
        <div className='flex items-center gap-2'>
          {/* Status Badge */}
          <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider', getAppointmentStatusStyle(data.status))}>
            {formatEnums(data.status)}
          </span>
          {/* Risk Badge */}
          <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider', getRiskLevelStyle(data.riskLevel))}>
            {formatEnums(data.riskLevel)} Risk
          </span>
          {/* Intake Status Alert */}
          {!data.intakeFormId && (
            <span className='inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-800 shadow-sm uppercase tracking-wider shrink-0'>
              <FileWarningIcon className='w-3 h-3 text-amber-600' />
              Pending Intake
            </span>
          )}
        </div>

        <Link href={`/doctor/appointment/${data.appointmentId}`} className='shrink-0'>
          <Button className='cursor-pointer text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow px-4 py-2 border-0 flex items-center gap-1.5 transition-all duration-200'>
            Review
            <ArrowRightIcon className='w-3.5 h-3.5' />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DoctorAppointmentCard;

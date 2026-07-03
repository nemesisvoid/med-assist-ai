'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import {
  UserRound,
  CalendarDays,
  Clock,
  ArrowRight,
  FileWarning,
  CheckCircle2,
  XCircle,
  Activity,
  Hourglass,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Stethoscope,
  ClipboardCheck,
  TriangleAlert,
} from 'lucide-react';
import { AppointmentStatus, RiskLevel } from '@/generated/prisma/enums';
import { cn, formatEnums, getAppointmentStatusStyle, getRiskLevelStyle } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DoctorAppointmentItem = {
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

type FilterStatus = 'ALL' | AppointmentStatus;
type FilterRisk = 'ALL' | RiskLevel;

// ── Risk config ───────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { bar: string; dot: string; label: string; priority: number }> = {
  HIGH:   { bar: 'bg-rose-500',    dot: 'bg-rose-500',    label: 'High',   priority: 0 },
  MEDIUM: { bar: 'bg-amber-400',   dot: 'bg-amber-400',   label: 'Medium', priority: 1 },
  LOW:    { bar: 'bg-emerald-400', dot: 'bg-emerald-400', label: 'Low',    priority: 2 },
};

// ── Status icon map ───────────────────────────────────────────────────────────

function StatusIcon({ status, size = 13 }: { status: AppointmentStatus; size?: number }) {
  switch (status) {
    case 'COMPLETED':       return <CheckCircle2 size={size} className='text-emerald-600' />;
    case 'CANCELLED':       return <XCircle      size={size} className='text-slate-400' />;
    case 'IN_PROGRESS':     return <Activity     size={size} className='text-sky-600 animate-pulse' />;
    case 'PENDING_INTAKE':  return <FileWarning  size={size} className='text-amber-600' />;
    case 'ASSIGNED':        return <Stethoscope  size={size} className='text-indigo-600' />;
    case 'READY_FOR_REVIEW':return <ClipboardCheck size={size} className='text-blue-600' />;
    default:                return <Hourglass    size={size} className='text-slate-400' />;
  }
}

// ── Triage Row ────────────────────────────────────────────────────────────────

const TriageRow = ({ item, index }: { item: DoctorAppointmentItem; index: number }) => {
  const riskCfg = RISK_CONFIG[item.riskLevel] ?? RISK_CONFIG.LOW;
  const scheduledAt = new Date(item.scheduledDate);
  const upcoming = isFuture(scheduledAt);
  const isTerminal = item.status === 'COMPLETED' || item.status === 'CANCELLED';

  const dayLabel = isToday(scheduledAt)
    ? 'Today'
    : isTomorrow(scheduledAt)
    ? 'Tomorrow'
    : format(scheduledAt, 'MMM d, yyyy');

  const relLabel = upcoming
    ? `in ${formatDistanceToNow(scheduledAt)}`
    : `${formatDistanceToNow(scheduledAt)} ago`;

  const initials = item.patientName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={cn(
        'group relative flex items-center gap-0 transition-all duration-200',
        isTerminal ? 'opacity-60 hover:opacity-80' : 'hover:bg-slate-50/80',
      )}
      role='row'
      aria-label={`Patient ${item.patientName}, ${item.status}`}
    >
      {/* ── Risk Colour Bar (left) ─────────────────────────────────── */}
      <div
        className={cn('w-1 self-stretch rounded-l-md shrink-0 transition-all', riskCfg.bar)}
        aria-hidden='true'
      />

      {/* ── Row Number ───────────────────────────────────────────────── */}
      <div className='w-8 text-center text-[11px] font-bold text-text-soft pl-2 pr-1 shrink-0'>
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* ── Avatar ───────────────────────────────────────────────────── */}
      <div className='px-3 py-3.5 shrink-0'>
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black tracking-tight shrink-0 border',
            item.riskLevel === 'HIGH'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : item.riskLevel === 'MEDIUM'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-50 text-slate-600 border-slate-200',
          )}
          aria-hidden='true'
        >
          {initials || <UserRound size={15} />}
        </div>
      </div>

      {/* ── Patient + Reason ─────────────────────────────────────────── */}
      <div className='flex-1 min-w-0 py-3.5 pr-3'>
        <div className='flex items-center gap-2 min-w-0'>
          <p className='text-sm font-bold text-text-base truncate'>{item.patientName}</p>
          {!item.intakeFormId && !isTerminal && (
            <span
              className='shrink-0 inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md'
              title='Intake form not submitted'
            >
              <TriangleAlert size={8} />
              No Intake
            </span>
          )}
        </div>
        <p className='text-xs text-text-muted mt-0.5 truncate max-w-[260px]'>{item.appointmentReason}</p>
      </div>

      {/* ── Type ─────────────────────────────────────────────────────── */}
      <div className='hidden lg:block w-36 py-3.5 pr-3 shrink-0'>
        <p className='text-[11px] font-bold text-text-soft uppercase tracking-widest truncate'>
          {item.appointmentType}
        </p>
      </div>

      {/* ── Schedule ─────────────────────────────────────────────────── */}
      <div className='hidden md:flex flex-col w-44 py-3.5 pr-6 shrink-0'>
        <div className='flex items-center gap-1.5 text-xs font-semibold text-text-base'>
          <CalendarDays size={12} className='text-text-soft shrink-0' />
          <span>{dayLabel}</span>
          {isToday(scheduledAt) && (
            <span className='ml-1 text-[9px] font-black bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md border border-sky-200 uppercase tracking-wider animate-pulse'>
              Now
            </span>
          )}
        </div>
        {item.scheduledTime && (
          <div className='flex items-center gap-1.5 text-xs text-text-muted mt-0.5'>
            <Clock size={12} className='text-text-soft shrink-0' />
            <span>{item.scheduledTime}</span>
            <span className='text-text-soft'>·</span>
            <span className='text-[11px]'>{relLabel}</span>
          </div>
        )}
      </div>

      {/* ── Badges ───────────────────────────────────────────────────── */}
      <div className='hidden sm:flex items-center gap-2 w-64 py-3.5 pr-6 shrink-0'>
        {/* Status */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border',
            getAppointmentStatusStyle(item.status),
          )}
        >
          <StatusIcon status={item.status} size={10} />
          {formatEnums(item.status)}
        </span>

        {/* Risk */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border',
            getRiskLevelStyle(item.riskLevel),
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', riskCfg.dot)} aria-hidden='true' />
          {riskCfg.label}
        </span>
      </div>

      {/* ── Action ───────────────────────────────────────────────────── */}
      <div className='py-3.5 pr-3 pl-1 shrink-0'>
        <Link
          href={`/doctor/appointment/${item.appointmentId}`}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1',
            isTerminal
              ? 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
              : 'text-accent-primary bg-accent-soft border-accent-primary/20 hover:border-accent-primary/40 hover:bg-accent-soft/80',
          )}
          aria-label={`Review appointment for ${item.patientName}`}
        >
          {isTerminal ? 'View' : 'Review'}
          <ArrowRight size={12} className='group-hover:translate-x-0.5 transition-transform duration-150' />
        </Link>
      </div>
    </div>
  );
};

// ── Divider ───────────────────────────────────────────────────────────────────

const RowDivider = () => (
  <div className='h-px bg-slate-100 mx-3' role='separator' aria-hidden='true' />
);

// ── Summary Stat ──────────────────────────────────────────────────────────────

const StatPill = ({
  label,
  value,
  active,
  onClick,
  color = 'default',
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  color?: 'default' | 'rose' | 'amber' | 'emerald' | 'sky';
}) => {
  const colorMap = {
    default: active ? 'bg-text-base text-white border-text-base' : 'bg-white text-text-muted border-slate-200 hover:border-slate-300',
    rose:    active ? 'bg-rose-600 text-white border-rose-600'   : 'bg-white text-rose-700 border-rose-200 hover:border-rose-300',
    amber:   active ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-300',
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:border-emerald-300',
    sky:     active ? 'bg-sky-600 text-white border-sky-600'     : 'bg-white text-sky-700 border-sky-200 hover:border-sky-300',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer',
        colorMap[color],
      )}
      aria-pressed={active}
    >
      {label}
      <span className={cn('text-[10px] font-black tabular-nums', active ? 'opacity-80' : '')}>
        {value}
      </span>
    </button>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────

const EmptyQueue = ({ filtered }: { filtered: boolean }) => (
  <div className='flex flex-col items-center justify-center py-20 text-center'>
    <div className='w-14 h-14 rounded-2xl bg-bg-surface border border-slate-200 flex items-center justify-center mb-4 text-text-soft'>
      <Stethoscope size={24} />
    </div>
    <p className='text-sm font-bold text-text-base mb-1'>
      {filtered ? 'No matches found' : 'Queue is clear'}
    </p>
    <p className='text-xs text-text-muted max-w-[200px] leading-relaxed'>
      {filtered
        ? 'Try adjusting your filters or search query.'
        : 'No appointments are currently scheduled.'}
    </p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

type DoctorAppointmentListProps = {
  data: DoctorAppointmentItem[];
};

const DoctorAppointmentList = ({ data }: DoctorAppointmentListProps) => {
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('ALL');
  const [filterRisk, setFilterRisk]       = useState<FilterRisk>('ALL');
  const [showFilters, setShowFilters]     = useState(false);

  // ── Sort: by risk priority, then soonest date ───────────────────────────
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aT = a.status === 'COMPLETED' || a.status === 'CANCELLED';
      const bT = b.status === 'COMPLETED' || b.status === 'CANCELLED';
      if (aT !== bT) return aT ? 1 : -1;
      const rA = RISK_CONFIG[a.riskLevel]?.priority ?? 99;
      const rB = RISK_CONFIG[b.riskLevel]?.priority ?? 99;
      if (rA !== rB) return rA - rB;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });
  }, [data]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return sorted.filter(item => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.appointmentType.toLowerCase().includes(q) ||
        item.appointmentReason.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchRisk   = filterRisk   === 'ALL' || item.riskLevel === filterRisk;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [sorted, search, filterStatus, filterRisk]);

  // ── Stats for filter pills ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     data.length,
    high:      data.filter(d => d.riskLevel === 'HIGH').length,
    medium:    data.filter(d => d.riskLevel === 'MEDIUM').length,
    noIntake:  data.filter(d => !d.intakeFormId && d.status !== 'COMPLETED' && d.status !== 'CANCELLED').length,
    today:     data.filter(d => isToday(new Date(d.scheduledDate))).length,
    inProgress:data.filter(d => d.status === 'IN_PROGRESS').length,
  }), [data]);

  const isFiltered = search || filterStatus !== 'ALL' || filterRisk !== 'ALL';

  return (
    <div className='flex flex-col gap-4'>

      {/* ── Quick-stat filter bar ──────────────────────────────────────── */}
      <div className='flex flex-wrap items-center gap-2'>
        <StatPill
          label='All'
          value={stats.total}
          active={filterStatus === 'ALL' && filterRisk === 'ALL'}
          onClick={() => { setFilterStatus('ALL'); setFilterRisk('ALL'); }}
          color='default'
        />
        {stats.inProgress > 0 && (
          <StatPill
            label='In Progress'
            value={stats.inProgress}
            active={filterStatus === 'IN_PROGRESS'}
            onClick={() => setFilterStatus(s => s === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            color='sky'
          />
        )}
        {stats.high > 0 && (
          <StatPill
            label='High Risk'
            value={stats.high}
            active={filterRisk === 'HIGH'}
            onClick={() => setFilterRisk(r => r === 'HIGH' ? 'ALL' : 'HIGH')}
            color='rose'
          />
        )}
        {stats.medium > 0 && (
          <StatPill
            label='Medium Risk'
            value={stats.medium}
            active={filterRisk === 'MEDIUM'}
            onClick={() => setFilterRisk(r => r === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
            color='amber'
          />
        )}
        {stats.noIntake > 0 && (
          <StatPill
            label='No Intake'
            value={stats.noIntake}
            active={filterStatus === 'PENDING_INTAKE'}
            onClick={() => setFilterStatus(s => s === 'PENDING_INTAKE' ? 'ALL' : 'PENDING_INTAKE')}
            color='amber'
          />
        )}
        {stats.today > 0 && (
          <span className='ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg'>
            <CalendarDays size={12} />
            {stats.today} today
          </span>
        )}
      </div>

      {/* ── Search + Advanced Filters ─────────────────────────────────── */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          {/* Search */}
          <div className='relative flex-1'>
            <Search
              size={14}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-text-soft pointer-events-none'
              aria-hidden='true'
            />
            <input
              type='text'
              placeholder='Search patient, type, or reason…'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all placeholder:text-text-soft'
              aria-label='Search appointments'
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-all duration-150 cursor-pointer',
              showFilters
                ? 'bg-text-base text-white border-text-base'
                : 'bg-white text-text-muted border-slate-200 hover:border-slate-300',
            )}
            aria-expanded={showFilters}
            aria-label='Toggle advanced filters'
          >
            <SlidersHorizontal size={14} />
            Filters
            <ChevronDown
              size={13}
              className={cn('transition-transform duration-200', showFilters && 'rotate-180')}
            />
          </button>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className='flex flex-wrap gap-3 p-3 bg-bg-surface rounded-xl border border-slate-200/80'>
            {/* Status filter */}
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-bold text-text-soft uppercase tracking-widest'>Status</label>
              <div className='flex flex-wrap gap-1.5'>
                {(['ALL', 'PENDING_INTAKE', 'READY_FOR_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all duration-100 cursor-pointer',
                      filterStatus === s
                        ? 'bg-text-base text-white border-text-base'
                        : 'bg-white text-text-muted border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {s === 'ALL' ? 'All' : formatEnums(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk filter */}
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-bold text-text-soft uppercase tracking-widest'>Risk Level</label>
              <div className='flex flex-wrap gap-1.5'>
                {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as FilterRisk[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setFilterRisk(r)}
                    className={cn(
                      'text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all duration-100 cursor-pointer',
                      filterRisk === r
                        ? 'bg-text-base text-white border-text-base'
                        : 'bg-white text-text-muted border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {r === 'ALL' ? 'All Risks' : `${r.charAt(0) + r.slice(1).toLowerCase()} Risk`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Queue Table ───────────────────────────────────────────────── */}
      <div
        className='bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden'
        role='table'
        aria-label='Appointment queue'
      >
        {/* Table Header */}
        <div
          className='flex items-center gap-0 bg-bg-white border-b border-slate-200/80 px-0'
          role='rowgroup'
        >
          <div className='w-1 shrink-0' aria-hidden='true' />
          <div className='w-8 pl-2 pr-1 shrink-0' />
          <div className='w-12 px-3 py-2.5 shrink-0' aria-hidden='true' />
          <div className='flex-1 py-2.5 pr-3'>
            <span className='text-[10px] font-black text-text-soft uppercase tracking-widest'>Patient</span>
          </div>
          <div className='hidden lg:block w-36 py-2.5 pr-3 shrink-0'>
            <span className='text-[10px] font-black text-text-soft uppercase tracking-widest'>Type</span>
          </div>
          <div className='hidden md:block w-47 py-2.5 pr-6 shrink-0'>
            <span className='text-[10px] font-black text-text-soft uppercase tracking-widest'>Scheduled</span>
          </div>
          <div className='hidden sm:block w-64 py-2.5 pr-6 shrink-0'>
            <span className='text-[10px] font-black text-text-soft uppercase tracking-widest'>Status / Risk</span>
          </div>
          <div className='py-2.5 pr-3 pl-1 shrink-0'>
            <span className='text-[10px] font-black text-text-soft uppercase tracking-widest'>Action</span>
          </div>
        </div>

        {/* Rows */}
        <div role='rowgroup'>
          {filtered.length === 0 ? (
            <EmptyQueue filtered={!!isFiltered} />
          ) : (
            filtered.map((item, i) => (
              <div key={item.appointmentId}>
                {i > 0 && <RowDivider />}
                <TriageRow item={item} index={i} />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className='border-t border-slate-100 px-4 py-2.5 flex items-center justify-between'>
            <p className='text-[11px] text-text-soft font-medium'>
              Showing <span className='font-bold text-text-muted'>{filtered.length}</span> of{' '}
              <span className='font-bold text-text-muted'>{data.length}</span> appointments
            </p>
            {isFiltered && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterRisk('ALL'); }}
                className='text-[11px] font-bold text-accent-primary hover:underline cursor-pointer'
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointmentList;

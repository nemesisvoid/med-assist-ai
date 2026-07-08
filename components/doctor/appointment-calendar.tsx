'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowRight, Clock, User, Tag } from 'lucide-react';

interface Appointment {
  scheduledAt: string | Date;
  scheduledTime?: string | null;
  title: string | null;
  appointmentId: string;
  appointmentType: string;
  appointmentReason?: string | null;
  intakeFormId?: string | null;
  patientName: string;
  status: string;
  riskLevel?: string | null;
  scheduledDate?: string | Date | null;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
}

const STATUS_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  CONFIRMED:      { dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-700 border-teal-200',       text: 'Confirmed' },
  PENDING:        { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',    text: 'Pending' },
  PENDING_INTAKE: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',    text: 'Pending Intake' },
  COMPLETED:      { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Completed' },
  CANCELLED:      { dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200',          text: 'Cancelled' },
  DEFAULT:        { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200',       text: 'Scheduled' },
};

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.DEFAULT;
}

const MAX_VISIBLE_DOTS = 3;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AppointmentCalendar({ appointments }: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const calendarRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build date -> appointments map
  const appointmentMap = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = format(new Date(appt.scheduledAt), 'yyyy-MM-dd');
    if (!appointmentMap.has(key)) appointmentMap.set(key, []);
    appointmentMap.get(key)!.push(appt);
  }

  // Calendar grid (Mon-start weeks)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const hoveredAppts = hoveredDay
    ? (appointmentMap.get(format(hoveredDay, 'yyyy-MM-dd')) ?? [])
    : [];

  function handleDayMouseEnter(day: Date, e: React.MouseEvent<HTMLButtonElement>) {
    const key = format(day, 'yyyy-MM-dd');
    if (!appointmentMap.has(key)) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);

    const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const calRect = calendarRef.current?.getBoundingClientRect();
    if (!calRect) return;

    const relLeft = cellRect.left - calRect.left + cellRect.width / 2;
    const relTop  = cellRect.bottom - calRect.top + 4;

    // Flip to left-align if we'd overflow the right edge
    const POPUP_WIDTH = 256; // w-64
    const spaceRight = calRect.width - relLeft;

    const style: React.CSSProperties =
      spaceRight < POPUP_WIDTH
        ? { top: relTop, right: calRect.width - relLeft, position: 'absolute' }
        : { top: relTop, left: relLeft, position: 'absolute' };

    setPopupStyle(style);
    setHoveredDay(day);
  }

  function handleDayMouseLeave() {
    hoverTimeout.current = setTimeout(() => setHoveredDay(null), 200);
  }
  function handlePopupEnter() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }
  function handlePopupLeave() {
    hoverTimeout.current = setTimeout(() => setHoveredDay(null), 120);
  }

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center leading-tight">
          <p className="text-sm font-bold text-slate-800">{format(currentMonth, 'MMMM')}</p>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">{format(currentMonth, 'yyyy')}</p>
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div ref={calendarRef} className="relative px-3 pb-4 pt-2">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayAppts = appointmentMap.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const hasAppts = dayAppts.length > 0;
            const visibleDots = dayAppts.slice(0, MAX_VISIBLE_DOTS);
            const extra = dayAppts.length - MAX_VISIBLE_DOTS;

            return (
              <button
                key={key}
                onMouseEnter={(e) => handleDayMouseEnter(day, e)}
                onMouseLeave={handleDayMouseLeave}
                className={`
                  flex flex-col items-center justify-start py-1.5 rounded-xl
                  transition-all duration-150 group min-h-[44px]
                  ${!inMonth ? 'opacity-25 pointer-events-none' : ''}
                  ${hasAppts ? 'hover:bg-violet-50/70 cursor-pointer' : 'cursor-default'}
                `}
              >
                {/* Day number */}
                <span
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full
                    text-xs font-semibold transition-all duration-150
                    ${isCurrentDay
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                      : hasAppts
                        ? 'text-slate-700 group-hover:text-violet-600'
                        : 'text-slate-500'}
                  `}
                >
                  {format(day, 'd')}
                </span>

                {/* Dots */}
                {hasAppts && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    {visibleDots.map((appt, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(appt.status).dot}`}
                      />
                    ))}
                    {extra > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Popup */}
        {hoveredDay && hoveredAppts.length > 0 && (
          <div
            style={popupStyle}
            onMouseEnter={handlePopupEnter}
            onMouseLeave={handlePopupLeave}
            className="z-50 w-64 rounded-xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden"
          >
            {/* Popup header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-500 to-indigo-500">
              <p className="text-white text-xs font-bold">{format(hoveredDay, 'EEEE, MMMM d')}</p>
              <p className="text-violet-200 text-[10px] mt-0.5">
                {hoveredAppts.length} appointment{hoveredAppts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Appointments */}
            <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
              {hoveredAppts.map((appt) => {
                const style = getStatusStyle(appt.status);
                return (
                  <div
                    key={appt.appointmentId}
                    className="px-4 py-3 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Patient name + badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {appt.patientName}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                        {style.text}
                      </span>
                    </div>

                    {/* Time + type */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2">
                      {appt.scheduledTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            {appt.scheduledTime}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-500">{appt.appointmentType}</span>
                      </div>
                    </div>

                    {/* Title snippet */}
                    {appt.title && (
                      <p className="text-[10px] text-slate-400 truncate mb-2">{appt.title}</p>
                    )}

                    {/* CTA link */}
                    <Link
                      href={`/doctor/appointment/${appt.appointmentId}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-800 transition-colors group/link"
                    >
                      View appointment
                      <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

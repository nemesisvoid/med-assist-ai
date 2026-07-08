"use client";

import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import { useRouter } from 'next/navigation';
import { CalendarIcon } from 'lucide-react';

interface UpcomingScheduleWidgetProps {
  appointments: any[];
}

export default function UpcomingScheduleWidget({ appointments }: UpcomingScheduleWidgetProps) {
  const router = useRouter();

  const events = appointments.map((appt) => {
    const date = new Date(appt.scheduledAt);
    
    // Assign colors based on status
    let bgColor = '#3b82f6'; // default blue
    if (appt.status === 'COMPLETED') bgColor = '#10b981'; // green
    if (appt.status === 'PENDING_INTAKE') bgColor = '#f59e0b'; // amber
    if (appt.status === 'CANCELLED') bgColor = '#ef4444'; // red

    return {
      id: appt.appointmentId,
      title: `${appt.scheduledTime || ''} | ${appt.patientName} - ${appt.appointmentType}`,
      start: date,
      allDay: false,
      extendedProps: {
        reason: appt.appointmentReason,
        status: appt.status,
      },
      backgroundColor: bgColor,
      borderColor: 'transparent',
      classNames: ['cursor-pointer', 'hover:opacity-80', 'transition-opacity'],
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Upcoming Schedule</h2>
        </div>
      </div>
      <div className="p-4 flex-1 min-h-0">
        <FullCalendar
          plugins={[listPlugin]}
          initialView="listTwoDays"
          views={{
            listTwoDays: {
              type: 'list',
              duration: { days: 2 },
              buttonText: '2 days'
            }
          }}
          headerToolbar={false}
          events={events}
          height="100%"
          noEventsText="No appointments in the next 48 hours"
          eventClick={(info) => {
            router.push(`/doctor/appointment/${info.event.id}`);
          }}
        />
      </div>
    </div>
  );
}

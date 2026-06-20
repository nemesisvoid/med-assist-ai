"use client";

import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';

interface FullCalendarViewProps {
  appointments: any[];
}

export default function FullCalendarView({ appointments }: FullCalendarViewProps) {
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 md:p-6 h-[800px]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        height="100%"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        eventClick={(info) => {
          router.push(`/doctor/appointment/${info.event.id}`);
        }}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { User, MessageSquare, ExternalLink, CalendarDays, Activity, Pill, AlertCircle } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { getAge } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Patient {
  id: string;
  name: string;
  email: string;
  image: string | null;
  patientProfile?: {
    dateOfBirth: Date;
    bloodGroup: string;
    gender: string;
  } | null;
}

interface LastAppointment {
  id: string;
  reason: string;
  type: string;
  scheduledAt: Date;
}

interface RecentPatient {
  patient: Patient;
  lastAppointment: LastAppointment;
}

interface RecentPatientsWidgetProps {
  recentPatients: RecentPatient[];
}

export default function RecentPatientsWidget({ recentPatients }: RecentPatientsWidgetProps) {
  const [selectedPatient, setSelectedPatient] = useState<RecentPatient | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handlePatientClick = (patient: RecentPatient) => {
    setSelectedPatient(patient);
    setSheetOpen(true);
  };

  if (!recentPatients || recentPatients.length === 0) {
    return null; // Don't render if there are no recent patients
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Patients</h2>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {recentPatients.map((rp) => {
            const initials = rp.patient.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <button
                key={rp.patient.id}
                onClick={() => handlePatientClick(rp)}
                className="flex flex-col items-center gap-2 min-w-[80px] p-2 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-transparent group-hover:border-blue-100 transition-colors">
                    <AvatarImage src={rp.patient.image || undefined} alt={rp.patient.name} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate w-full text-center group-hover:text-blue-600 transition-colors">
                  {rp.patient.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md w-full p-0 flex flex-col overflow-y-auto">
          {selectedPatient && (
            <>
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 pb-10 relative">
                <div className="absolute top-0 right-0 p-4">
                  {/* Decorative faint icon */}
                  <User className="w-32 h-32 text-white/5" />
                </div>
                <div className="relative z-10 flex flex-col items-center text-center mt-4">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-xl mb-4">
                    <AvatarImage src={selectedPatient.patient.image || undefined} alt={selectedPatient.patient.name} />
                    <AvatarFallback className="bg-white text-blue-600 text-3xl font-bold">
                      {selectedPatient.patient.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <SheetTitle className="text-2xl font-bold text-white mb-1">
                    {selectedPatient.patient.name}
                  </SheetTitle>
                  <SheetDescription className="text-blue-100 flex items-center justify-center gap-2">
                    <span>
                      {selectedPatient.patient.patientProfile?.gender || 'Unknown'} •{' '}
                      {selectedPatient.patient.patientProfile?.dateOfBirth 
                        ? `${getAge(selectedPatient.patient.patientProfile.dateOfBirth)} yrs` 
                        : 'Age N/A'}
                    </span>
                    {selectedPatient.patient.patientProfile?.bloodGroup && (
                      <Badge variant="outline" className="text-white border-white/20 bg-white/10 ml-2">
                        {selectedPatient.patient.patientProfile.bloodGroup}
                      </Badge>
                    )}
                  </SheetDescription>
                </div>
              </div>

              {/* Patient Details */}
              <div className="p-6 flex flex-col gap-6 -mt-4 bg-white rounded-t-2xl relative z-20">
                {/* Last Interaction Card */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Last Interaction
                  </h4>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedPatient.lastAppointment.type}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        "{selectedPatient.lastAppointment.reason}"
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-2">
                        {format(new Date(selectedPatient.lastAppointment.scheduledAt), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/doctor/messages" className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 rounded-xl shadow-sm">
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  </Link>
                </div>

                {/* Full Profile Link */}
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <Link href={`/doctor/patients/${selectedPatient.patient.id}`} className="w-full">
                    <Button variant="ghost" className="w-full gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <ExternalLink className="w-4 h-4" />
                      View Full Medical Record
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

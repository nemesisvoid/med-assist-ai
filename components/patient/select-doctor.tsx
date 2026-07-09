'use client';

import { useState, useEffect } from 'react';
import * as z from 'zod';

import { Controller, UseFormReturn } from 'react-hook-form';
import { Search, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchDoctors } from '@/actions/doctor.action';
import { checkActiveAppointment } from '@/actions/patient.action';
import { AppointmentFormSchema } from '@/validations/validation';

type SelectDoctorProps = {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
  userId: string;
  onConflict: (hasConflict: boolean) => void;
};
export type DoctorResult = {
  id: string;
  name: string;
  email: string;
  role: string;
  doctorProfile: {
    availabilityStatus: string;
    specialty: string;
    yearsOfExperience: number | null;
    bio: string | null;
    imageUrl: string | null;
  } | null;
};

const getInitials = (name: string) => {
  const parts = name.replace('Dr. ', '').split(' ');
  return parts
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const SelectDoctor = ({ form, userId, onConflict }: SelectDoctorProps) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchInput);
  const [searchResults, setSearchResults] = useState<DoctorResult[]>([]);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [conflictDoctorId, setConflictDoctorId] = useState<string | null>(null);

  const handleDoctorSelect = async (field: any, doctorId: string) => {
    field.onChange(doctorId);
    const { hasActive } = await checkActiveAppointment(userId, doctorId);
    setConflictDoctorId(hasActive ? doctorId : null);
    onConflict(hasActive);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 600);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch doctors
  useEffect(() => {
    async function fetchDoctors() {
      try {
        setIsPending(true);
        const doctors = await searchDoctors(debouncedSearch);

        setSearchResults((doctors as unknown as DoctorResult[]) || []);
      } catch (error) {
        console.error('Failed to fetch doctors', error);
      } finally {
        setIsPending(false);
      }
    }
    fetchDoctors();
  }, [debouncedSearch]);

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto'>
      <h3 className='font-semibold text-lg text-text-base mb-6'>Choose a doctor</h3>
      <Controller
        name='doctor'
        control={form.control}
        render={({ field }) => (
          <div className='flex flex-col gap-4'>
            {/* Search Input */}
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-slate-400' />
              </div>
              <input
                type='text'
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder='Search by name or specialty...'
                className='block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm'
              />
            </div>

            {/* Scrollable List Container */}
            <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar'>
              {/* Static Option: Any Available Doctor */}
              <button
                type='button'
                onClick={() => {
                  field.onChange('any_available');
                  setConflictDoctorId(null);
                  onConflict(false);
                }}
                className={cn(
                  'flex items-start gap-4 p-5 rounded-xl border transition-all text-left w-full',
                  field.value === 'any_available'
                    ? 'border-blue-600 bg-blue-50/30 shadow-sm ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                )}>
                <div className='w-12 h-12 shrink-0 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-inner'>
                  <Sparkles
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <h4 className='font-bold text-slate-900 text-[15px]'>Any Available Doctor</h4>
                  <p className='text-xs font-medium text-slate-500'>All Specialties</p>
                  <p className='text-sm text-slate-500 mt-1'>
                    We&apos;ll assign the best-suited available doctor based on your visit type and symptoms.
                  </p>
                </div>
              </button>

              {/* Dynamic Doctor List */}
              {isPending ? (
                <div className='py-8 text-center text-sm text-slate-500 animate-pulse'>Searching providers...</div>
              ) : (
                searchResults.map(doc => {
                  const isSelected = field.value === doc.id;
                  const profile = doc.doctorProfile;
                  const isAvailable = profile?.availabilityStatus === 'AVAILABLE';
                  const hasConflict = conflictDoctorId === doc.id;

                  return (
                    <button
                      key={doc.id}
                      type='button'
                      disabled={!isAvailable}
                      onClick={() => handleDoctorSelect(field, doc.id)}
                      className={cn(
                        'flex flex-col gap-4 p-5 rounded-xl border transition-all text-left w-full relative',
                        !isAvailable && 'opacity-60 cursor-not-allowed bg-slate-50',
                        hasConflict
                          ? 'border-amber-400 bg-amber-50/40 shadow-sm ring-1 ring-amber-400'
                          : isSelected && isAvailable
                          ? 'border-blue-600 bg-blue-50/30 shadow-sm ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      )}>
                      <div className='flex items-start gap-4'>
                        {/* Avatar */}
                        <div className='w-12 h-12 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200'>
                          {profile?.imageUrl ? (
                            <img
                              src={profile.imageUrl}
                              alt={doc.name}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-[15px]'>{getInitials(doc.name)}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className='flex flex-col w-full'>
                          <div className='flex items-start justify-between mb-1'>
                            <h4 className='font-bold text-slate-900 text-[15px]'>{doc.name}</h4>

                            {/* Availability Badge */}
                            {isAvailable ? (
                              <span className='bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-100'>
                                Available
                              </span>
                            ) : (
                              <span className='bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-1 rounded-full'>Unavailable</span>
                            )}
                          </div>

                          {/* Specialty & Exp */}
                          <p className='text-[13px] font-medium text-slate-600 mb-2'>
                            {profile?.specialty || 'General Practice'}
                            {profile?.yearsOfExperience ? ` · ${profile.yearsOfExperience} yrs exp` : ''}
                          </p>

                          {/* Bio / Description */}
                          <p className='text-[13px] text-slate-500 line-clamp-2 mb-3 leading-relaxed'>
                            {profile?.bio || 'Specialist dedicated to providing comprehensive and compassionate care.'}
                          </p>
                        </div>
                      </div>

                      {/* Conflict Warning Banner */}
                      {hasConflict && (
                        <div className='flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg w-full'>
                          <AlertCircle className='w-3.5 h-3.5 shrink-0' />
                          You already have an active appointment with this doctor. Please choose a different doctor or wait until your current appointment is completed.
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      />
      {form.formState.errors.doctor && (
        <p className='text-red-500 text-sm mt-3 font-medium flex items-center gap-1.5'>Please select a doctor to continue.</p>
      )}
    </div>
  );
};

export default SelectDoctor;

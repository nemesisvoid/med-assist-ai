'use client';

import { useState, useTransition } from 'react';
import { CalendarClockIcon, IdCardIcon, ActivityIcon } from 'lucide-react';
import { toast } from 'sonner';

import { updateMyClinicianProfile } from '@/actions/clinician.action';
import { ClinicianProfileSchema } from '@/validations/clinician';
import { type OpeningHours } from '@/lib/clinic-hours';
import { cn } from '@/lib/utils';
import WeeklyHoursEditor from '@/components/shared/weekly-hours-editor';

type Availability = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_LEAVE';

export type ClinicianProfileFormValues = {
  specialty: string;
  bio: string;
  yearsOfExperience: string;
  credentials: string;
  availabilityStatus: Availability;
  workingHours: OpeningHours | null;
};

const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm aria-invalid:border-red-500';

const AVAILABILITY: { value: Availability; label: string; hint: string }[] = [
  { value: 'AVAILABLE', label: 'Available', hint: 'Patients can book you' },
  { value: 'BUSY', label: 'Busy', hint: 'Shown as busy to admins' },
  { value: 'OFFLINE', label: 'Offline', hint: 'Not taking new bookings' },
  { value: 'ON_LEAVE', label: 'On leave', hint: 'Away for a while' },
];

function Section({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className='overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm'>
      <header className='flex items-start gap-2.5 border-b border-slate-100 px-5 py-4'>
        <span className='mt-0.5 text-slate-400'>{icon}</span>
        <div>
          <h2 className='text-sm font-bold text-slate-800'>{title}</h2>
          <p className='mt-0.5 text-xs text-slate-500'>{description}</p>
        </div>
      </header>
      <div className='grid content-start gap-4 p-5'>{children}</div>
    </section>
  );
}

export default function ClinicianProfileForm({
  initial,
  isTherapist,
  clinicHours,
  clinicTimezone,
}: {
  initial: ClinicianProfileFormValues;
  isTherapist: boolean;
  clinicHours: OpeningHours;
  clinicTimezone: string;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const set = <K extends keyof ClinicianProfileFormValues>(key: K, value: ClinicianProfileFormValues[K]) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    const parsed = ClinicianProfileSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === 'workingHours' ? String(issue.path[1] ?? 'workingHours') : String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await updateMyClinicianProfile(form);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });
  };

  const usesOwnHours = form.workingHours !== null;

  return (
    <div className='flex flex-col gap-6 pb-24'>
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Section title='Professional profile' description='Shown to patients when they choose a clinician.' icon={<IdCardIcon className='size-4' />}>
          <div>
            <label htmlFor='profile-specialty' className={labelClass}>Specialty</label>
            <input
              id='profile-specialty'
              value={form.specialty}
              onChange={e => set('specialty', e.target.value)}
              aria-invalid={!!errors.specialty || undefined}
              className={inputClass}
            />
            {errors.specialty && <p className='mt-1 text-xs font-medium text-red-600'>{errors.specialty}</p>}
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label htmlFor='profile-years' className={labelClass}>Years of experience</label>
              <input
                id='profile-years'
                type='number'
                min={0}
                max={70}
                inputMode='numeric'
                value={form.yearsOfExperience}
                onChange={e => set('yearsOfExperience', e.target.value)}
                aria-invalid={!!errors.yearsOfExperience || undefined}
                className={inputClass}
              />
              {errors.yearsOfExperience && <p className='mt-1 text-xs font-medium text-red-600'>{errors.yearsOfExperience}</p>}
            </div>
            {isTherapist && (
              <div>
                <label htmlFor='profile-credentials' className={labelClass}>Credentials</label>
                <input
                  id='profile-credentials'
                  value={form.credentials}
                  onChange={e => set('credentials', e.target.value)}
                  placeholder='e.g. LMFT, PsyD'
                  className={inputClass}
                />
              </div>
            )}
          </div>
          <div>
            <label htmlFor='profile-bio' className={labelClass}>Bio</label>
            <textarea
              id='profile-bio'
              rows={5}
              maxLength={1000}
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder='Your approach, areas of focus and languages you speak.'
              className={cn(inputClass, 'resize-none')}
            />
            {errors.bio && <p className='mt-1 text-xs font-medium text-red-600'>{errors.bio}</p>}
          </div>
        </Section>

        <Section title='Availability' description='Whether patients can book you right now.' icon={<ActivityIcon className='size-4' />}>
          <div role='radiogroup' aria-label='Availability' className='grid gap-2 sm:grid-cols-2'>
            {AVAILABILITY.map(option => (
              <button
                key={option.value}
                type='button'
                role='radio'
                aria-checked={form.availabilityStatus === option.value}
                onClick={() => set('availabilityStatus', option.value)}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  form.availabilityStatus === option.value ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50',
                )}>
                <span className='block text-sm font-semibold text-slate-800'>{option.label}</span>
                <span className='block text-xs text-slate-500'>{option.hint}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title='Working hours'
        description={`When patients can book you. Bookable times are the overlap of your hours and the clinic’s (times are ${clinicTimezone.replace(/_/g, ' ')}).`}
        icon={<CalendarClockIcon className='size-4' />}>
        <div role='radiogroup' aria-label='Working hours' className='flex flex-wrap gap-2'>
          {[
            { own: false, label: 'Same as the clinic' },
            { own: true, label: 'Set my own hours' },
          ].map(option => (
            <button
              key={String(option.own)}
              type='button'
              role='radio'
              aria-checked={usesOwnHours === option.own}
              onClick={() => set('workingHours', option.own ? (form.workingHours ?? clinicHours) : null)}
              className={cn(
                'cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                usesOwnHours === option.own ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}>
              {option.label}
            </button>
          ))}
        </div>
        {usesOwnHours && form.workingHours ? (
          <WeeklyHoursEditor
            value={form.workingHours}
            onChange={hours => set('workingHours', hours)}
            errors={errors}
            reference={clinicHours}
            referenceLabel='Clinic'
            idPrefix='working'
          />
        ) : (
          <p className='rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600'>You can be booked whenever the clinic is open.</p>
        )}
      </Section>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:left-(--sidebar-width)'>
        <div className='mx-auto flex max-w-6xl justify-end'>
          <button
            type='button'
            onClick={handleSave}
            disabled={isPending}
            className='inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'>
            {isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

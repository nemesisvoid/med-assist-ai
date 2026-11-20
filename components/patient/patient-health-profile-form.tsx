'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulseIcon, LoaderIcon, PhoneIcon } from 'lucide-react';
import { toast } from 'sonner';

import { updateMyPatientProfile } from '@/actions/patient.action';
import { PatientHealthProfileSchema } from '@/validations/account';
import Section, { settingsInputClass, settingsLabelClass } from '@/components/shared/settings-section';
import { cn } from '@/lib/utils';

export type PatientHealthFormValues = {
  genotype: string;
  bloodGroup: string;
  allergies: string;
  medications: string;
  medicalHistory: string;
  emergencyContact: string;
  insuranceProvider: string;
};

type Key = keyof PatientHealthFormValues;

const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC', 'CC', 'Unknown'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

/** Keep a value saved before these lists existed (e.g. "o+") selectable. */
const withCurrent = (options: string[], current: string) => (current && !options.includes(current) ? [current, ...options] : options);

export default function PatientHealthProfileForm({ initial }: { initial: PatientHealthFormValues }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [isPending, startTransition] = useTransition();
  const dirty = (Object.keys(form) as Key[]).some(k => form[k] !== saved[k]);

  const set = (key: Key, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const handleSave = () => {
    const parsed = PatientHealthProfileSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Key;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await updateMyPatientProfile(form);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setSaved(form);
      router.refresh();
    });
  };

  const error = (key: Key) =>
    errors[key] ? (
      <p id={`health-${key}-error`} className='mt-1 text-xs font-medium text-red-600'>
        {errors[key]}
      </p>
    ) : null;

  const select = (key: 'genotype' | 'bloodGroup', label: string, options: string[]) => (
    <div>
      <label htmlFor={`health-${key}`} className={settingsLabelClass}>
        {label}
      </label>
      <select
        id={`health-${key}`}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? `health-${key}-error` : undefined}
        className={cn(settingsInputClass, 'cursor-pointer')}>
        <option value=''>Select…</option>
        {withCurrent(options, form[key]).map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error(key)}
    </div>
  );

  const textarea = (key: Key, label: string, placeholder: string, rows = 3, maxLength = 1000) => (
    <div>
      <label htmlFor={`health-${key}`} className={settingsLabelClass}>
        {label}
      </label>
      <textarea
        id={`health-${key}`}
        rows={rows}
        maxLength={maxLength}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? `health-${key}-error` : undefined}
        className={cn(settingsInputClass, 'resize-none')}
      />
      {error(key)}
    </div>
  );

  const text = (key: Key, label: string, placeholder: string, maxLength: number, autoComplete?: string) => (
    <div>
      <label htmlFor={`health-${key}`} className={settingsLabelClass}>
        {label}
      </label>
      <input
        id={`health-${key}`}
        value={form[key]}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? `health-${key}-error` : undefined}
        className={settingsInputClass}
      />
      {error(key)}
    </div>
  );

  return (
    <>
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <Section
          className='xl:col-span-2'
          title='Health details'
          description='Your clinicians see this before your visits. If allergies or medications change, they’re notified.'
          icon={<HeartPulseIcon className='size-4' />}>
          <div className='grid gap-4 sm:grid-cols-2'>
            {select('genotype', 'Genotype', GENOTYPES)}
            {select('bloodGroup', 'Blood group', BLOOD_GROUPS)}
          </div>
          {textarea('allergies', 'Allergies', 'Food, drug or environmental allergies, or “None”')}
          {textarea('medications', 'Current medications', 'Prescriptions and supplements you take, with doses if you know them')}
          {textarea('medicalHistory', 'Past medical history', 'Surgeries, long-term conditions or ongoing treatment', 4, 2000)}
        </Section>

        <Section title='Emergency & insurance' description='Who to contact in an emergency, and how your care is covered.' icon={<PhoneIcon className='size-4' />}>
          {text('emergencyContact', 'Emergency contact', 'Name and phone number', 200)}
          {text('insuranceProvider', 'Insurance provider', 'e.g. AXA Mansard, or “Self-pay”', 120)}
        </Section>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:left-(--sidebar-width)'>
        <div className='mx-auto flex max-w-6xl items-center justify-end gap-3'>
          {dirty && !isPending && (
            <p className='text-xs font-medium text-amber-700' aria-live='polite'>
              Unsaved changes
            </p>
          )}
          <button
            type='button'
            onClick={handleSave}
            disabled={isPending || !dirty}
            className='inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'>
            {isPending && <LoaderIcon className='size-4 animate-spin' aria-hidden />}
            {isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </>
  );
}

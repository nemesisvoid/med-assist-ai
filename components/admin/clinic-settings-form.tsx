'use client';

import { useState } from 'react';
import { Building2Icon, ClockIcon, MapPinIcon, SirenIcon, StethoscopeIcon, VideoIcon } from 'lucide-react';

import { updateClinicSettings } from '@/actions/admin.action';
import { ClinicSettingsSchema } from '@/validations/clinic';
import { WEEKDAYS, WEEKDAY_LABELS, type OpeningHours, type Weekday } from '@/lib/clinic-hours';
import { cn } from '@/lib/utils';
import { Panel } from './admin-ui';
import { btnPrimary, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';

type FormState = {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mapUrl: string;
  arrivalInstructions: string;
  timezone: string;
  openingHours: OpeningHours;
  inPersonEnabled: boolean;
  videoEnabled: boolean;
  emergencyNumber: string;
};

type TextField = Exclude<keyof FormState, 'openingHours' | 'inPersonEnabled' | 'videoEnabled' | 'timezone'>;

export default function ClinicSettingsForm({
  initial,
  timezones,
  lastUpdated,
}: {
  initial: FormState;
  timezones: string[];
  lastUpdated: string | null;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, isPending } = useAdminAction();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }));
  const setDay = (day: Weekday, value: OpeningHours[Weekday]) => setForm(f => ({ ...f, openingHours: { ...f.openingHours, [day]: value } }));

  const handleSave = () => {
    const parsed = ClinicSettingsSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    run(() => updateClinicSettings(form));
  };

  const text = (key: TextField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`clinic-${key}`} className={fieldLabelClass}>
        {label}
      </label>
      <input
        id={`clinic-${key}`}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? `clinic-${key}-error` : undefined}
        className={fieldInputClass}
        {...props}
      />
      {errors[key] && (
        <p id={`clinic-${key}-error`} className='mt-1 text-xs font-medium text-red-600'>
          {errors[key]}
        </p>
      )}
    </div>
  );

  const emergencyPreview = form.emergencyNumber.trim()
    ? `For medical emergencies, call ${form.emergencyNumber.trim()} or go to your nearest emergency department immediately.`
    : 'For medical emergencies, call your local emergency number or go to your nearest emergency department immediately.';

  return (
    <div className='flex flex-col gap-6 pb-24'>
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Panel title='Clinic profile' description='How the clinic is named and contacted.' icon={<Building2Icon className='size-4' />} bodyClassName='grid content-start gap-4 p-5'>
          {text('name', 'Clinic name', { autoComplete: 'organization' })}
          <div className='grid gap-4 sm:grid-cols-2'>
            {text('phone', 'Phone', { type: 'tel', autoComplete: 'tel', placeholder: '+234 …' })}
            {text('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'hello@clinic.org' })}
          </div>
        </Panel>

        <Panel
          title='Address'
          description='Shown to patients with in-person appointments.'
          icon={<MapPinIcon className='size-4' />}
          bodyClassName='grid content-start gap-4 p-5'>
          {text('addressLine1', 'Street address', { autoComplete: 'address-line1' })}
          {text('addressLine2', 'Building, floor, suite (optional)', { autoComplete: 'address-line2' })}
          <div className='grid gap-4 sm:grid-cols-3'>
            {text('city', 'City', { autoComplete: 'address-level2' })}
            {text('state', 'State / region', { autoComplete: 'address-level1' })}
            {text('postalCode', 'Postal code', { autoComplete: 'postal-code' })}
          </div>
          {text('country', 'Country', { autoComplete: 'country-name' })}
          {text('mapUrl', 'Map link (optional)', { type: 'url', placeholder: 'https://maps.google.com/…' })}
          <div>
            <label htmlFor='clinic-arrivalInstructions' className={fieldLabelClass}>
              Arrival instructions (optional)
            </label>
            <textarea
              id='clinic-arrivalInstructions'
              rows={3}
              maxLength={500}
              value={form.arrivalInstructions}
              onChange={e => set('arrivalInstructions', e.target.value)}
              placeholder='e.g. Use the side entrance on Adeola Street. Bring a photo ID and any recent test results.'
              className={cn(fieldInputClass, 'resize-none')}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title='Opening hours'
        description='Patients can only book slots within these hours. Times are in the clinic’s timezone.'
        icon={<ClockIcon className='size-4' />}
        bodyClassName='p-5'>
        <div className='mb-5 max-w-sm'>
          <label htmlFor='clinic-timezone' className={fieldLabelClass}>
            Timezone
          </label>
          <select
            id='clinic-timezone'
            value={form.timezone}
            onChange={e => set('timezone', e.target.value)}
            className={cn(fieldInputClass, 'cursor-pointer')}>
            {timezones.map(tz => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className='sr-only'>Opening hours by day</legend>
          <ul className='divide-y divide-slate-100 rounded-xl border border-slate-200'>
            {WEEKDAYS.map(day => {
              const hours = form.openingHours[day];
              const error = errors[`openingHours.${day}`];
              return (
                <li key={day} className='flex flex-wrap items-center gap-3 px-4 py-3'>
                  <label className='flex w-36 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800'>
                    <input
                      type='checkbox'
                      checked={!!hours}
                      onChange={e => setDay(day, e.target.checked ? { open: '09:00', close: '17:00' } : null)}
                      className='size-4 accent-blue-600'
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                  {hours ? (
                    <div className='flex items-center gap-2 text-sm text-slate-600'>
                      <input
                        type='time'
                        aria-label={`${WEEKDAY_LABELS[day]} opening time`}
                        value={hours.open}
                        onChange={e => setDay(day, { ...hours, open: e.target.value })}
                        className={cn(fieldInputClass, 'w-32 py-1.5')}
                      />
                      <span aria-hidden>to</span>
                      <input
                        type='time'
                        aria-label={`${WEEKDAY_LABELS[day]} closing time`}
                        value={hours.close}
                        onChange={e => setDay(day, { ...hours, close: e.target.value })}
                        className={cn(fieldInputClass, 'w-32 py-1.5')}
                      />
                    </div>
                  ) : (
                    <span className='text-sm text-slate-400'>Closed</span>
                  )}
                  {error && <p className='w-full text-xs font-medium text-red-600'>{error}</p>}
                </li>
              );
            })}
          </ul>
        </fieldset>
      </Panel>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Panel
          title='Visit types offered'
          description='What patients can choose when booking. At least one must be on.'
          icon={<StethoscopeIcon className='size-4' />}
          bodyClassName='grid content-start gap-3 p-5'>
          {(
            [
              ['inPersonEnabled', 'In-person visits', 'Patients come to the clinic address above.', StethoscopeIcon],
              ['videoEnabled', 'Video consultations', 'Patients meet their clinician on a secure video call.', VideoIcon],
            ] as const
          ).map(([key, label, hint, Icon]) => (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                form[key] ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50',
              )}>
              <input type='checkbox' checked={form[key]} onChange={e => set(key, e.target.checked)} className='mt-0.5 size-4 accent-blue-600' />
              <Icon className='mt-0.5 size-4 text-slate-500' aria-hidden />
              <span>
                <span className='block text-sm font-semibold text-slate-800'>{label}</span>
                <span className='block text-xs text-slate-500'>{hint}</span>
              </span>
            </label>
          ))}
          {errors.videoEnabled && <p className='text-xs font-medium text-red-600'>{errors.videoEnabled}</p>}
        </Panel>

        <Panel
          title='Emergency number'
          description='Shown to patients in chat and when booking video consultations.'
          icon={<SirenIcon className='size-4' />}
          bodyClassName='grid content-start gap-4 p-5'>
          {text('emergencyNumber', 'Emergency number', { inputMode: 'tel', placeholder: 'e.g. 112' })}
          <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800'>
            <span className='mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-700'>Preview</span>
            {emergencyPreview}
          </div>
        </Panel>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:left-(--sidebar-width)'>
        <div className='mx-auto flex max-w-6xl items-center justify-between gap-4'>
          <p className='text-xs text-slate-500' suppressHydrationWarning>
            {lastUpdated ? `Last saved ${new Date(lastUpdated).toLocaleString()}` : 'Using default settings. Nothing has been saved yet.'}
          </p>
          <button type='button' onClick={handleSave} disabled={isPending} className={btnPrimary}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

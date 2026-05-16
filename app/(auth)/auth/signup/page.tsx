import Link from 'next/link';

import { ActivityIcon, StarsIcon, CheckIcon } from 'lucide-react';
// import { BrandMark } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
const SignUpPage = () => {
  return (
    <main className='min-h-screen bg-bg-app px-4 py-8 text-text-base'>
      <div className='mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[460px_1fr]'>
        <Card className='border-0 shadow-xl shadow-shadow-ambient'>
          <CardHeader className='pb-4'>
            {/* <BrandMark />s */}
            <Badge className='mt-8 w-fit'>Stage two demo</Badge>
            <CardTitle className='mt-4 text-2xl'>Create your workspace</CardTitle>
            <p className='text-sm text-text-muted'>Set up a provider account for appointments, triage, and AI note drafts.</p>
          </CardHeader>
          <CardContent>
            <form className='grid gap-4'>
              <Input
                name='name'
                placeholder='Dr. Remi Okafor'
              />
              <Input
                name='email'
                placeholder='doctor@cliniq.ai'
                type='email'
              />
              <div className='grid gap-4 sm:grid-cols-2'>
                <Input
                  name='specialty'
                  placeholder='Family medicine'
                />
                <Input
                  name='license'
                  placeholder='MD-20489'
                />
              </div>
              <Input
                name='password'
                placeholder='Create a password'
                type='password'
              />
              <Button
                className='mt-2'
                size='lg'
                type='submit'>
                Create account
              </Button>
            </form>
            <p className='mt-6 text-center text-sm text-text-muted'>
              Already have an account?{' '}
              <Link
                className='font-semibold text-accent-primary'
                href='/login'>
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <section className='hidden lg:block'>
          <div className='rounded-lg border border-border-subtle bg-bg-canvas p-6 shadow-sm shadow-shadow-ambient'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-semibold text-text-muted'>Today&apos;s flow</p>
                <h1 className='mt-2 text-3xl font-semibold tracking-normal'>Intake to AI clinical note</h1>
              </div>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent-primary'>
                <StarsIcon className='h-6 w-6' />
              </div>
            </div>
            <div className='mt-8 grid gap-4'>
              {[
                ['Patient submits intake', 'Symptoms, complaint, allergies, medications'],
                ['AI triage summarizes risk', 'Severity, priority, and follow-up signals'],
                ['Doctor reviews appointment', 'Draft SOAP note and plan before consultation'],
              ].map(([title, body], index) => (
                <div
                  className='flex gap-4 rounded-lg bg-bg-surface p-4'
                  key={title}>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-canvas text-sm font-semibold text-accent-primary'>
                    {index + 1}
                  </div>
                  <div>
                    <p className='font-semibold text-text-base'>{title}</p>
                    <p className='mt-1 text-sm text-text-muted'>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-4'>
            <div className='rounded-lg bg-accent-primary p-5 text-white'>
              <ActivityIcon className='h-5 w-5' />
              <p className='mt-4 text-2xl font-semibold'>42</p>
              <p className='text-sm text-white/80'>appointments processed</p>
            </div>
            <div className='rounded-lg bg-success p-5 text-white'>
              <CheckIcon className='h-5 w-5' />
              <p className='mt-4 text-2xl font-semibold'>98%</p>
              <p className='text-sm text-white/80'>intake completion</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default SignUpPage;

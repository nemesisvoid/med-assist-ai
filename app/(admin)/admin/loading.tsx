import { Skeleton } from '@/components/ui/skeleton';

const AdminLoading = () => (
  <div
    className='flex flex-col gap-6'
    aria-busy='true'
    aria-label='Loading'>
    <div className='space-y-2'>
      <Skeleton className='h-7 w-56' />
      <Skeleton className='h-4 w-96 max-w-full' />
    </div>
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className='h-32 rounded-2xl'
        />
      ))}
    </div>
    <Skeleton className='h-96 rounded-2xl' />
  </div>
);

export default AdminLoading;

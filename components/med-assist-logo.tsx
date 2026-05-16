// @/components/ui/logo.tsx
export const MedAssistLogo = ({ isCollapsed }: { isCollapsed: boolean }) => {
  return (
    <div className='flex items-center gap-3 overflow-hidden py-1 transition-all'>
      <div className='relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20'>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          className='w-5 h-5 text-white'
          xmlns='http://www.w3.org/2000/svg'>
          {/* Medical Cross Foundation */}
          <path
            d='M19 10.5H13.5V5C13.5 4.44772 13.0523 4 12.5 4H11.5C10.9477 4 10.5 4.44772 10.5 5V10.5H5C4.44772 10.5 4 10.9477 4 11.5V12.5C4 13.0523 4.44772 13.5 5 13.5H10.5V19C10.5 19.5523 10.9477 20 11.5 20H12.5C13.0523 20 13.5 19.5523 13.5 19V13.5H19C19.5523 13.5 20 13.0523 20 12.5V11.5C20 10.9477 19.5523 10.5 19 10.5Z'
            fill='currentColor'
          />
          {/* AI Connection Core */}
          <circle
            cx='12'
            cy='12'
            r='2'
            fill='#93C5FD'
          />
        </svg>
      </div>
      {!isCollapsed && (
        <span className='font-extrabold text-[15px] tracking-tight text-slate-900 whitespace-nowrap animate-in fade-in duration-300'>
          MED <span className='text-blue-600 font-medium'>ASSIST</span> AI
        </span>
      )}
    </div>
  );
};

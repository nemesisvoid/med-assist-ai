import { MapPinIcon, VideoIcon } from 'lucide-react';
import type { VisitMode } from '@/generated/prisma/enums';
import { VISIT_MODE_LABEL } from '@/lib/visit-mode';
import { cn } from '@/lib/utils';

/** "In person" / "Video consultation" pill, with an icon so it isn't colour-only. */
export default function VisitModeBadge({ mode, className }: { mode: VisitMode; className?: string }) {
  const Icon = mode === 'VIDEO' ? VideoIcon : MapPinIcon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        mode === 'VIDEO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600',
        className,
      )}>
      <Icon className='size-3' aria-hidden />
      {VISIT_MODE_LABEL[mode]}
    </span>
  );
}

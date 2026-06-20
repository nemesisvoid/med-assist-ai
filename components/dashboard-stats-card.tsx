type DashboardStatCardProps = {
  stat: string;
  desc: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
};

const DashboardStatCard = ({ stat, desc, icon, color, bgColor }: DashboardStatCardProps) => {
  return (
    <div className='group bg-white p-5 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden'>
      {/* Subtle hover background glow */}
      <div className='absolute -right-10 -bottom-10 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-blue-50/20 transition-all duration-500 blur-xl' />
      
      <div className='flex items-start justify-between relative z-10'>
        <div className='space-y-3.5'>
          <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>{desc}</p>
          <h3 className='text-3xl font-extrabold text-slate-800 tracking-tight'>{stat}</h3>
        </div>
        
        <div className={`p-3 rounded-xl shrink-0 ${bgColor || 'bg-slate-50'} ${color || 'text-slate-600'} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatCard;

type DashboardStatCardProps = {
  stat: string;
  desc: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
};
const DashboardStatCard = ({ stat, desc, icon, color, bgColor }: DashboardStatCardProps) => {
  return (
    <div className='bg-white p-4 shadow-md shadow-accent-soft rounded-md hover:shadow-lg border border-gray-300 hover:-translate-y-1.5 transition-all duration-200'>
      <div className='flex flex-col justify-center gap-2 '>
        <div className={`${bgColor} w-fit rounded-sm mb-1 p-1.5`}>
          <div className={`${color}`}>{icon}</div>
        </div>
        <h3 className='text-2xl font-semibold mt-1'>{stat}</h3>
        <p className='text-sm text-text-muted'>{desc}</p>
      </div>
    </div>
  );
};

export default DashboardStatCard;

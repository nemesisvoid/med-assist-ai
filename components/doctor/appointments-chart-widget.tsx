'use client';

import { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getDashboardAnalytics } from '@/actions/doctor.action';
import { Activity } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';

const chartConfig = {
  appointments: {
    label: "Appointments",
    color: "hsl(var(--primary))",
  }
} satisfies ChartConfig;

type TimeRange = '7d' | '30d' | '6m' | '1y';

export default function AppointmentsChartWidget({ doctorId }: { doctorId: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<{ date: string, appointments: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const res = await getDashboardAnalytics(doctorId, timeRange);
      setData(res);
      setLoading(false);
    };
    loadData();
  }, [doctorId, timeRange]);

  const totalAppointments = data.reduce((acc, curr) => acc + curr.appointments, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-6 h-fit">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Appointments Over Time
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Total of {totalAppointments} appointments in this period
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={(val: TimeRange) => setTimeRange(val)}>
          <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 focus:ring-0">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="1y">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[300px] w-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-appointments)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-appointments)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                className="text-xs text-slate-500 font-medium"
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                allowDecimals={false}
                className="text-xs text-slate-500 font-medium"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey="appointments" 
                stroke="var(--color-appointments)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAppts)" 
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}

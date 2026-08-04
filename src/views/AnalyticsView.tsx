import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const listeningHoursData = [
    { day: 'Mon', hours: 420 },
    { day: 'Tue', hours: 510 },
    { day: 'Wed', hours: 680 },
    { day: 'Thu', hours: 720 },
    { day: 'Fri', hours: 890 },
    { day: 'Sat', hours: 1120 },
    { day: 'Sun', hours: 1450 },
  ];

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28">
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
          Analytics & Insights
        </h2>
        <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
          In-depth telemetry of seeker engagement, listen time, and audio streaming bandwidth.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 md:p-8 rounded-2xl border-t-2 border-[#f2ca50]">
          <h3 className="font-serif-headline text-xl text-[#dce2f6] font-bold mb-2">
            Weekly Devotional Hours
          </h3>
          <p className="text-xs text-[#d0c5af]/70 mb-6">Total hours of sacred audio streamed per day</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={listeningHoursData}>
                <XAxis dataKey="day" stroke="#99907c" tickLine={false} />
                <YAxis stroke="#99907c" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#19202e',
                    borderColor: '#d4af37',
                    borderRadius: '8px',
                    color: '#dce2f6',
                  }}
                />
                <Bar dataKey="hours" fill="#f2ca50" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-2xl border-t-2 border-[#f2ca50]">
          <h3 className="font-serif-headline text-xl text-[#dce2f6] font-bold mb-2">
            Global Seeker Retention
          </h3>
          <p className="text-xs text-[#d0c5af]/70 mb-6">Percentage of active daily sadhakas returning</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={listeningHoursData}>
                <XAxis dataKey="day" stroke="#99907c" tickLine={false} />
                <YAxis stroke="#99907c" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#19202e',
                    borderColor: '#d4af37',
                    borderRadius: '8px',
                    color: '#dce2f6',
                  }}
                />
                <Area type="monotone" dataKey="hours" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

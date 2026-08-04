import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_RENEWALS,
  USER_TIERS_DATA,
} from '../data/mockData';

export const SubscriptionsView: React.FC = () => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [timeframeCategory, setTimeframeCategory] = useState<'Daily' | 'Monthly' | 'Yearly'>(
    'Daily'
  );
  const [showManagePlansModal, setShowManagePlansModal] = useState(false);

  const filteredTransactions = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter((tx) => {
      const matchStatus =
        selectedStatusFilter === 'All' || tx.status === selectedStatusFilter;
      const matchTime = tx.timeframeCategory === timeframeCategory;
      return matchStatus && matchTime;
    });
  }, [selectedStatusFilter, timeframeCategory]);

  const handleDownloadReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Transaction ID,Timestamp,Contributor,Service,Status,Amount\n' +
      INITIAL_TRANSACTIONS.map(
        (t) =>
          `"${t.id}","${t.timestamp}","${t.contributor}","${t.service}","${t.status}",$${t.amount}`
      ).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sadhana_revenue_treasury_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReceipt = (id: string) => {
    alert(`Downloading Official Temple Offering Receipt for transaction ${id}...`);
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Revenue Treasury
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Real-time stewardship of temple offerings and digital subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadReport}
            className="px-5 py-2.5 rounded-xl border border-white/10 font-semibold text-sm text-[#dce2f6] hover:bg-white/5 transition-all shadow-md"
          >
            Download Report
          </button>
          <button
            onClick={() => setShowManagePlansModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#3c2f00] font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#d4af37]/20"
          >
            Manage Plans
          </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#f2ca50] p-2 bg-[#f2ca50]/10 rounded-xl">
              payments
            </span>
            <span className="text-emerald-400 font-bold text-xs flex items-center">
              <span className="material-symbols-outlined text-[14px] mr-0.5">
                trending_up
              </span>
              +12.5%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#d0c5af]/80 uppercase tracking-wider">
              Total Revenue
            </p>
            <h3 className="font-serif-headline text-3xl md:text-4xl text-[#f2ca50] text-glow-gold mt-1 font-bold">
              $482,900
            </h3>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#c0c6de] p-2 bg-[#c0c6de]/10 rounded-xl">
              person_add
            </span>
            <span className="text-emerald-400 font-bold text-xs flex items-center">
              <span className="material-symbols-outlined text-[14px] mr-0.5">
                trending_up
              </span>
              +4.2%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#d0c5af]/80 uppercase tracking-wider">
              Active Subscriptions
            </p>
            <h3 className="font-serif-headline text-3xl md:text-4xl text-[#dce2f6] mt-1 font-bold">
              12,408
            </h3>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#ffb4ab] p-2 bg-[#ffb4ab]/10 rounded-xl">
              person_remove
            </span>
            <span className="text-emerald-400 font-bold text-xs flex items-center">
              <span className="material-symbols-outlined text-[14px] mr-0.5">
                trending_down
              </span>
              -0.8%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#d0c5af]/80 uppercase tracking-wider">
              Churn Rate
            </p>
            <h3 className="font-serif-headline text-3xl md:text-4xl text-[#dce2f6] mt-1 font-bold">
              2.1%
            </h3>
          </div>
        </div>

        {/* Average LTV */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between bg-[#f2ca50]/5 border-[#f2ca50]/20">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#f2ca50] p-2 bg-[#f2ca50]/20 rounded-xl">
              workspace_premium
            </span>
            <span className="text-[#f2ca50] font-bold text-xs">High Value</span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#d0c5af]/80 uppercase tracking-wider">
              Average LTV
            </p>
            <h3 className="font-serif-headline text-3xl md:text-4xl text-[#f2ca50] text-glow-gold mt-1 font-bold">
              $38.50
            </h3>
          </div>
        </div>
      </div>

      {/* Charts & Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Donut Chart */}
        <div className="glass-card p-6 md:p-8 rounded-2xl border-t-2 border-[#f2ca50]/30 flex flex-col justify-between">
          <h4 className="font-serif-headline text-xl font-semibold text-[#dce2f6] mb-4">
            User Tiers
          </h4>
          <div className="relative flex items-center justify-center py-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={USER_TIERS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {USER_TIERS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="font-serif-headline text-2xl font-bold text-[#dce2f6]">
                100%
              </span>
              <span className="block text-[10px] text-[#d0c5af]/70 uppercase tracking-widest">
                Total
              </span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {USER_TIERS_DATA.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-2.5"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-[#dce2f6] font-medium">{t.name}</span>
                </div>
                <span className="font-bold text-[#f2ca50]">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center">
            <h4 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">
              Upcoming Renewals
            </h4>
            <button
              onClick={() => alert('Viewing full renewals queue.')}
              className="text-[#f2ca50] text-xs font-semibold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#232a39] text-[#d0c5af] text-[11px] uppercase tracking-widest font-semibold border-b border-white/5">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {INITIAL_RENEWALS.map((ren) => (
                  <tr key={ren.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${ren.avatarBg} flex items-center justify-center font-bold text-xs`}
                        >
                          {ren.userInitials}
                        </div>
                        <span className="font-medium text-[#dce2f6]">{ren.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ren.plan === 'Premium Gold' ? (
                        <span className="px-3 py-1 rounded-full bg-[#f2ca50]/10 text-[#f2ca50] text-[10px] font-bold uppercase tracking-wider border border-[#f2ca50]/20">
                          Premium Gold
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-[#c0c6de]/10 text-[#c0c6de] text-[10px] font-bold uppercase tracking-wider border border-[#c0c6de]/20">
                          Standard Vedic
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#d0c5af]">{ren.dueDate}</td>
                    <td className="px-6 py-4 font-bold text-[#dce2f6]">
                      ${ren.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#d0c5af] hover:text-[#f2ca50]">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <h4 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">
            Transaction History
          </h4>

          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#151b2a] border border-white/10 rounded-lg py-2 pl-4 pr-10 text-xs text-[#dce2f6] outline-none focus:border-[#f2ca50]"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Timeframe Switcher */}
            <div className="flex items-center gap-1 bg-[#151b2a] border border-white/10 rounded-lg p-1">
              {(['Daily', 'Monthly', 'Yearly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframeCategory(tf)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    timeframeCategory === tf
                      ? 'bg-[#f2ca50] text-[#3c2f00] shadow-sm'
                      : 'text-[#d0c5af] hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#232a39] text-[#d0c5af] text-[11px] uppercase tracking-widest font-semibold border-b border-white/5">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Contributor</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-[#f2ca50]">{tx.id}</td>
                  <td className="px-6 py-4 text-xs text-[#d0c5af]">{tx.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-[#dce2f6]">{tx.contributor}</td>
                  <td className="px-6 py-4 text-xs text-[#d0c5af]">{tx.service}</td>
                  <td className="px-6 py-4">
                    {tx.status === 'Completed' && (
                      <div className="flex items-center text-emerald-400 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#10b981]" />
                        Completed
                      </div>
                    )}
                    {tx.status === 'Processing' && (
                      <div className="flex items-center text-[#f2ca50] text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] mr-2 animate-pulse" />
                        Processing
                      </div>
                    )}
                    {tx.status === 'Pending' && (
                      <div className="flex items-center text-[#d0c5af] text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40 mr-2" />
                        Pending
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-[#dce2f6]">
                    ${tx.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownloadReceipt(tx.id)}
                      className="text-[#f2ca50] hover:scale-110 transition-transform p-1"
                      title="Download Receipt"
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-between text-xs text-[#d0c5af]">
          <p>Showing 1-{filteredTransactions.length} of 1,240 records</p>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded border border-[#f2ca50]/30 bg-[#f2ca50]/10 text-[#f2ca50] font-bold">
              1
            </button>
            <button className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5">
              2
            </button>
            <button className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5">
              3
            </button>
            <button className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manage Plans Modal */}
      {showManagePlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                Manage Temple Subscription Plans
              </h3>
              <button
                onClick={() => setShowManagePlansModal(false)}
                className="text-[#d0c5af] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              <div className="p-4 bg-[#19202e] rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#f2ca50]">Dharma Elite Plan</p>
                  <p className="text-xs text-[#d0c5af]/80">
                    Unlimited Vedic Chants, Offline Downloads & Priority Ritual Seva
                  </p>
                </div>
                <span className="font-mono text-sm text-[#dce2f6] font-bold">$149/yr</span>
              </div>

              <div className="p-4 bg-[#19202e] rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#c0c6de]">Sadhaka Pro Plan</p>
                  <p className="text-xs text-[#d0c5af]/80">
                    Standard Audio Pass & Monthly Satsang Access
                  </p>
                </div>
                <span className="font-mono text-sm text-[#dce2f6] font-bold">$29/mo</span>
              </div>

              <div className="p-4 bg-[#19202e] rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#d0c5af]">Free Seeker Plan</p>
                  <p className="text-xs text-[#d0c5af]/80">Public Mantras & Daily Slokas</p>
                </div>
                <span className="font-mono text-sm text-[#dce2f6] font-bold">$0</span>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  onClick={() => {
                    alert('Subscription tiers updated.');
                    setShowManagePlansModal(false);
                  }}
                  className="px-5 py-2 rounded-lg bg-[#f2ca50] text-[#3c2f00] font-bold hover:brightness-110 shadow-md"
                >
                  Save Tier Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

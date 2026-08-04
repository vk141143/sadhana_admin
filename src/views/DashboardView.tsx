import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  SPIRITUAL_GROWTH_DATA,
  POPULAR_SADHANAS_DATA,
  INITIAL_ACTIVITIES,
} from '../data/mockData';
import { AudioTrack } from '../types';

interface DashboardViewProps {
  audioTracks: AudioTrack[];
  onPlayTrack: (track: AudioTrack) => void;
  onNavigateTab: (tab: any) => void;
  onAddAudioTrack: (newTrack: Partial<AudioTrack>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  audioTracks,
  onPlayTrack,
  onNavigateTab,
  onAddAudioTrack,
}) => {
  const [timeframeView, setTimeframeView] = useState<'Yearly' | 'Monthly'>('Yearly');
  const [showAddAudioModal, setShowAddAudioModal] = useState(false);

  // Form states for Add New Audio
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newCategory, setNewCategory] = useState('Stotram');
  const [newLanguage, setNewLanguage] = useState('Sanskrit');
  const [newDuration, setNewDuration] = useState('08:30');
  const [newIsPremium, setNewIsPremium] = useState(true);

  const handleExportRituals = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Metric,Value,Growth\nTotal Devotees,128492,+12%\nActive Sadhakas,42105,+5.2%\nMonthly Revenue,842000,+8.1%\nCompleted Sadhanas,1200000,Stable';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sadhana_rituals_metrics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newArtist) return;

    onAddAudioTrack({
      title: newTitle,
      artist: newArtist,
      category: newCategory,
      language: newLanguage,
      duration: newDuration,
      durationSeconds: 510,
      isPremium: newIsPremium,
      status: 'Active',
    });

    setShowAddAudioModal(false);
    setNewTitle('');
    setNewArtist('');
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl font-bold text-[#dce2f6] tracking-tight">
            Suprabhatam, Steward
          </h2>
          <p className="text-base md:text-lg text-[#d0c5af]/80 mt-2">
            The temple’s digital metrics are flourishing this morning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportRituals}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#232a39]/50 text-sm font-semibold text-[#dce2f6] hover:bg-white/10 transition-all active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">file_download</span>
            Export Rituals
          </button>
          <button
            onClick={() => setShowAddAudioModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#3c2f00] font-bold text-sm shadow-lg sacred-glow hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add New Audio
          </button>
        </div>
      </section>

      {/* Analytics Bento Grid Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">group</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d0c5af]/80">
            Total Devotees
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="font-serif-headline text-3xl md:text-4xl font-bold text-[#f2ca50]">
              128,492
            </h4>
            <span className="text-xs text-emerald-400 font-bold flex items-center">
              <span className="material-symbols-outlined text-sm">trending_up</span> 12%
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4">
            <div className="bg-[#f2ca50] w-3/4 h-full rounded-full shadow-[0_0_8px_#f2ca50]" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">bolt</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d0c5af]/80">
            Active Sadhakas
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="font-serif-headline text-3xl md:text-4xl font-bold text-[#f2ca50]">
              42,105
            </h4>
            <span className="text-xs text-emerald-400 font-bold flex items-center">
              <span className="material-symbols-outlined text-sm">trending_up</span> 5.2%
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4">
            <div className="bg-[#f2ca50] w-1/2 h-full rounded-full shadow-[0_0_8px_#f2ca50]" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">paid</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d0c5af]/80">
            Revenue (Monthly)
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="font-serif-headline text-3xl md:text-4xl font-bold text-[#f2ca50]">
              ₹842k
            </h4>
            <span className="text-xs text-emerald-400 font-bold flex items-center">
              <span className="material-symbols-outlined text-sm">trending_up</span> 8.1%
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4">
            <div className="bg-[#f2ca50] w-2/3 h-full rounded-full shadow-[0_0_8px_#f2ca50]" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">done_all</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d0c5af]/80">
            Completed Sadhanas
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="font-serif-headline text-3xl md:text-4xl font-bold text-[#f2ca50]">
              1.2M
            </h4>
            <span className="text-xs text-[#d0c5af] font-bold">Stable</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4">
            <div className="bg-[#f2ca50] w-5/6 h-full rounded-full shadow-[0_0_8px_#f2ca50]" />
          </div>
        </div>
      </section>

      {/* Interactive Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Growth Trend Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 md:p-8 border-t-2 border-[#f2ca50]/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">
                Spiritual Growth Trends
              </h3>
              <p className="text-xs text-[#d0c5af]/80">
                Devotional activity tracked over the last 12 months
              </p>
            </div>
            <select
              value={timeframeView}
              onChange={(e) => setTimeframeView(e.target.value as any)}
              className="bg-[#19202e] border border-white/10 rounded-lg text-xs px-3 py-1.5 text-[#dce2f6] focus:border-[#f2ca50] focus:ring-0 outline-none"
            >
              <option value="Yearly">Yearly View</option>
              <option value="Monthly">Monthly View</option>
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPIRITUAL_GROWTH_DATA}>
                <defs>
                  <linearGradient id="colorSeekers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f2ca50" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f2ca50" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#99907c" tickLine={false} />
                <YAxis stroke="#99907c" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#19202e',
                    borderColor: '#d4af37',
                    borderRadius: '8px',
                    color: '#dce2f6',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="seekers"
                  stroke="#f2ca50"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSeekers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Sadhanas Donut Chart */}
        <div className="glass-card rounded-2xl p-6 md:p-8 border-t-2 border-[#f2ca50]/30 flex flex-col justify-between">
          <div>
            <h3 className="font-serif-headline text-xl font-semibold text-[#dce2f6] mb-6">
              Popular Sadhanas
            </h3>
            <div className="h-48 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={POPULAR_SADHANAS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {POPULAR_SADHANAS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <p className="font-serif-headline text-2xl font-bold text-[#f2ca50]">45%</p>
                <p className="text-[11px] text-[#d0c5af]/80">Chanting</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {POPULAR_SADHANAS_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#dce2f6] font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-[#f2ca50]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Uploads & Recent Activity Feed */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Latest Audio Table */}
        <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-serif-headline text-lg font-semibold text-[#dce2f6]">
              Latest Uploaded Audio
            </h3>
            <button
              onClick={() => onNavigateTab('audio')}
              className="text-[#f2ca50] text-xs font-semibold hover:underline"
            >
              View All Audio
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#232a39]/50 text-[11px] text-[#d0c5af] uppercase tracking-wider border-b border-white/5">
                  <th className="py-3.5 px-6 font-semibold">Title</th>
                  <th className="py-3.5 px-6 font-semibold">Artist</th>
                  <th className="py-3.5 px-6 font-semibold">Category</th>
                  <th className="py-3.5 px-6 font-semibold">Duration</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {audioTracks.slice(0, 4).map((track) => (
                  <tr
                    key={track.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="w-9 h-9 rounded-lg bg-[#f2ca50]/15 text-[#f2ca50] group-hover:bg-[#f2ca50] group-hover:text-[#3c2f00] flex items-center justify-center transition-all"
                        >
                          <span
                            className="material-symbols-outlined text-xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            play_arrow
                          </span>
                        </button>
                        <span className="font-medium text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors">
                          {track.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#d0c5af]/80">{track.artist}</td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-[#19202e] rounded-md text-xs border border-white/10 text-[#dce2f6]">
                        {track.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#d0c5af]/80 font-mono text-xs">
                      {track.duration}
                    </td>
                    <td className="py-4 px-6">
                      {track.status === 'Active' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#f2ca50] text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#f2ca50] animate-pulse" />
                          Processing
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="text-[#f2ca50] hover:scale-110 transition-transform p-1"
                        title="Play"
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-serif-headline text-lg font-semibold text-[#dce2f6] border-b border-white/10 pb-3 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-5">
              {INITIAL_ACTIVITIES.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-white/10 space-y-1">
                  <div
                    className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${
                      act.type === 'gold'
                        ? 'bg-[#f2ca50] gold-glow'
                        : act.type === 'emerald'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : 'bg-white/40'
                    }`}
                  />
                  <p className="text-xs font-bold text-[#dce2f6]">{act.title}</p>
                  <p className="text-xs text-[#d0c5af]/80 leading-relaxed">{act.description}</p>
                  <span className="text-[10px] text-white/40 block pt-0.5">{act.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-10 right-8 z-30">
        <button
          onClick={() => setShowAddAudioModal(true)}
          className="w-14 h-14 bg-[#f2ca50] text-[#3c2f00] rounded-full shadow-[0_10px_30px_rgba(242,202,80,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all font-bold"
          title="Quick Upload"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      {/* Add New Audio Modal */}
      {showAddAudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 md:p-8 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-xl text-[#f2ca50] font-bold">
                Upload Sacred Audio
              </h3>
              <button
                onClick={() => setShowAddAudioModal(false)}
                className="text-[#d0c5af] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAudioSubmit} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#dce2f6] font-medium mb-1">Track Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shiva Tandava Stotram"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#dce2f6] font-medium mb-1">Artist / Chanter</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pandit V. Kumar"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#dce2f6] font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  >
                    <option value="Stotram">Stotram</option>
                    <option value="Japa">Japa</option>
                    <option value="Satsang">Satsang</option>
                    <option value="Bhajan">Bhajan</option>
                    <option value="Meditation">Meditation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#dce2f6] font-medium mb-1">Language</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  >
                    <option value="Sanskrit">Sanskrit</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#dce2f6]">
                  <input
                    type="checkbox"
                    checked={newIsPremium}
                    onChange={(e) => setNewIsPremium(e.target.checked)}
                    className="rounded bg-[#19202e] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                  <span>Premium Seeker Access Only</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddAudioModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-[#d0c5af] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#f2ca50] text-[#3c2f00] font-bold hover:brightness-110 shadow-md"
                >
                  Publish Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

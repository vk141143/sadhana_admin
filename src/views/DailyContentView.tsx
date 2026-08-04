import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ScheduleQuotesModal } from '../components/ScheduleQuotesModal';
import { QuoteSchedule } from '../types';

export const DailyContentView: React.FC = () => {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // scheduled quotes table
  const [schedQuotes,        setSchedQuotes]        = useState<QuoteSchedule[]>([]);
  const [fetchingScheduled,  setFetchingScheduled]  = useState(true);
  const [schedEditId,        setSchedEditId]        = useState<string | null>(null);
  const [schedEditForm,      setSchedEditForm]      = useState<Partial<QuoteSchedule>>({});
  const [schedDeleteTarget,  setSchedDeleteTarget]  = useState<QuoteSchedule | null>(null);
  const [schedDeleting,      setSchedDeleting]      = useState(false);

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  useEffect(() => { fetchScheduledQuotes(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchScheduledQuotes = async () => {
    setFetchingScheduled(true);
    const { data, error } = await supabase
      .from('quote_schedules')
      .select('*')
      .order('scheduled_datetime', { ascending: true });
    if (error) showToast(error.message, 'error');
    else setSchedQuotes((data as QuoteSchedule[]) || []);
    setFetchingScheduled(false);
  };

  // ── Scheduled quotes edit/delete ───────────────────────────
  const startSchedEdit = (q: QuoteSchedule) => {
    setSchedEditId(q.id);
    setSchedEditForm({ title: q.title, sloka: q.sloka, source: q.source, scheduled_date: q.scheduled_date, scheduled_time: q.scheduled_time });
  };

  const saveSchedEdit = async (id: string) => {
    const { scheduled_date, scheduled_time } = schedEditForm;
    if (!scheduled_date || !scheduled_time) return;
    const dt = new Date(`${scheduled_date}T${scheduled_time}:00`);
    const { error } = await supabase.from('quote_schedules').update({
      ...schedEditForm,
      scheduled_datetime: dt.toISOString(),
      day_name: DAYS[dt.getDay()],
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Quote updated!');
    setSchedEditId(null);
    fetchScheduledQuotes();
  };

  const confirmSchedDelete = async () => {
    if (!schedDeleteTarget) return;
    setSchedDeleting(true);
    const { error } = await supabase.from('quote_schedules').delete().eq('id', schedDeleteTarget.id);
    setSchedDeleting(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Deleted');
    setSchedDeleteTarget(null);
    fetchScheduledQuotes();
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Daily Quotes</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            <span className="text-blue-400 font-semibold">{schedQuotes.filter(q => q.status === 'scheduled').length}</span> scheduled ·{' '}
            <span className="text-emerald-400 font-semibold">{schedQuotes.filter(q => q.status === 'published').length}</span> published ·{' '}
            <span className="text-[#d0c5af]/40 font-semibold">{schedQuotes.filter(q => q.status === 'expired').length}</span> expired
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScheduleOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[#f2ca50]/10"
          >
            <span className="material-symbols-outlined text-base">schedule</span>
            Schedule Quotes
          </button>
        </div>
      </div>

      {/* ── Scheduled Quotes Table ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#dce2f6]">Scheduled Quotes</h3>
            <p className="text-xs text-[#d0c5af]/50 mt-0.5">
              <span className="text-blue-400 font-semibold">{schedQuotes.filter(q => q.status === 'scheduled').length}</span> scheduled ·{' '}
              <span className="text-emerald-400 font-semibold">{schedQuotes.filter(q => q.status === 'published').length}</span> published ·{' '}
              <span className="text-[#d0c5af]/40 font-semibold">{schedQuotes.filter(q => q.status === 'expired').length}</span> expired
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {fetchingScheduled ? (
            <div className="flex items-center justify-center h-32">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#f2ca50]">progress_activity</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#19202e] border-b-2 border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Sloka</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {schedQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#d0c5af]/40 text-sm">
                        No scheduled quotes yet.{' '}
                        <button onClick={() => setScheduleOpen(true)} className="text-[#f2ca50] underline underline-offset-2">Schedule one</button>
                      </td>
                    </tr>
                  ) : schedQuotes.map((q, i) => (
                    <tr key={q.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4 text-[11px] text-[#d0c5af]/30 font-mono">{i + 1}</td>

                      {/* Title */}
                      <td className="py-3 px-4 max-w-[140px]">
                        {schedEditId === q.id
                          ? <input value={schedEditForm.title || ''} onChange={e => setSchedEditForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50]" />
                          : <p className="font-semibold text-xs text-[#dce2f6] truncate group-hover:text-[#f2ca50] transition-colors">{q.title || '—'}</p>
                        }
                      </td>

                      {/* Sloka */}
                      <td className="py-3 px-4 max-w-[220px]">
                        {schedEditId === q.id
                          ? <textarea rows={2} value={schedEditForm.sloka || ''} onChange={e => setSchedEditForm(f => ({ ...f, sloka: e.target.value }))} className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50] resize-none" />
                          : <p className="text-xs text-[#d0c5af]/60 line-clamp-2">{q.sloka || '—'}</p>
                        }
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 max-w-[120px]">
                        {schedEditId === q.id
                          ? <input value={schedEditForm.source || ''} onChange={e => setSchedEditForm(f => ({ ...f, source: e.target.value }))} className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50]" />
                          : <p className="text-xs text-[#d0c5af]/50 italic truncate">{q.source || '—'}</p>
                        }
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          q.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          q.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-white/5 text-[#d0c5af]/40 border-white/10'
                        }`}>
                          {q.status === 'published' ? '● Published' : q.status === 'scheduled' ? '◷ Scheduled' : '○ Expired'}
                        </span>
                      </td>

                      {/* Day */}
                      <td className="py-3 px-4 text-xs text-[#d0c5af]/60 whitespace-nowrap">{q.day_name}</td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {schedEditId === q.id
                          ? <input type="date" value={schedEditForm.scheduled_date || ''} onChange={e => setSchedEditForm(f => ({ ...f, scheduled_date: e.target.value }))} className="bg-[#0c1321] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50]" />
                          : <p className="text-xs text-[#d0c5af]/60">{q.scheduled_date}</p>
                        }
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {schedEditId === q.id
                          ? <input type="time" value={schedEditForm.scheduled_time || ''} onChange={e => setSchedEditForm(f => ({ ...f, scheduled_time: e.target.value }))} className="bg-[#0c1321] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50]" />
                          : <p className="text-xs text-[#d0c5af]/60">{q.scheduled_time?.slice(0, 5)}</p>
                        }
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {schedEditId === q.id ? (
                            <>
                              <button onClick={() => setSchedEditId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-[#d0c5af] transition-all" title="Cancel">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                              <button onClick={() => saveSchedEdit(q.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 text-[#d0c5af] transition-all" title="Save">
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {q.status === 'scheduled' && (
                                <button onClick={() => startSchedEdit(q)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all" title="Edit">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                              )}
                              <button onClick={() => setSchedDeleteTarget(q)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all" title="Delete">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Scheduled Quote Delete Confirm ── */}
      {schedDeleteTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSchedDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-[#19202e] border border-rose-500/20 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-rose-400 text-2xl">delete_forever</span>
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6]">Delete Scheduled Quote?</h4>
              <p className="text-xs text-[#d0c5af]/60">"<span className="text-[#dce2f6] font-semibold">{schedDeleteTarget.title || '—'}</span>" will be permanently removed.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setSchedDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={confirmSchedDelete} disabled={schedDeleting} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {schedDeleting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {schedDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Quotes Modal ── */}
      {scheduleOpen && (
        <ScheduleQuotesModal
          onClose={() => setScheduleOpen(false)}
          onSaved={() => fetchScheduledQuotes()}
          showToast={showToast}
        />
      )}

    </div>
  );
};

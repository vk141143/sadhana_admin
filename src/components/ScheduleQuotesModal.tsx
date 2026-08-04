import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { QuoteSchedule } from '../types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface DraftCard {
  id: string; // temp id for UI
  title: string;
  sloka: string;
  source: string;
  date: string;
  time: string;
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const inputCls = 'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2 px-3 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none transition-all';
const labelCls = 'text-[10px] font-semibold text-[#f2ca50] block mb-1';

const emptyCard = (): DraftCard => ({
  id: crypto.randomUUID(),
  title: '', sloka: '', source: '',
  date: new Date().toISOString().split('T')[0],
  time: '06:00',
});

export const ScheduleQuotesModal: React.FC<Props> = ({ onClose, onSaved, showToast }) => {
  const [tab, setTab] = useState<'new' | 'scheduled'>('new');
  const [drafts, setDrafts] = useState<DraftCard[]>([emptyCard()]);
  const [saving, setSaving] = useState(false);
  const [scheduled, setScheduled] = useState<QuoteSchedule[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuoteSchedule>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tab === 'scheduled') fetchScheduled();
  }, [tab]);

  const fetchScheduled = async () => {
    setLoadingScheduled(true);
    const { data, error } = await supabase
      .from('quote_schedules')
      .select('*')
      .order('scheduled_datetime', { ascending: true });
    if (!error) setScheduled((data as QuoteSchedule[]) || []);
    setLoadingScheduled(false);
  };

  const updateDraft = (id: string, key: keyof DraftCard, val: string) =>
    setDrafts(d => d.map(c => c.id === id ? { ...c, [key]: val } : c));

  const addCard = () => setDrafts(d => [...d, emptyCard()]);
  const removeCard = (id: string) => setDrafts(d => d.filter(c => c.id !== id));

  const isCardValid = (c: DraftCard) => c.title.trim() && c.sloka.trim() && c.date && c.time;

  const handleSaveAll = async () => {
    const invalid = drafts.find(c => !isCardValid(c));
    if (invalid) { showToast('Fill Title, Sloka, Date & Time for all cards', 'error'); return; }

    setSaving(true);
    const rows = drafts.map(c => {
      const dt = new Date(`${c.date}T${c.time}:00`);
      return {
        title: c.title.trim(),
        sloka: c.sloka.trim(),
        source: c.source.trim(),
        scheduled_date: c.date,
        scheduled_time: c.time,
        scheduled_datetime: dt.toISOString(),
        day_name: DAYS[dt.getDay()],
        status: 'scheduled',
      };
    });

    const { error } = await supabase.from('quote_schedules').insert(rows);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${rows.length} quote(s) scheduled!`);
    onSaved();
    setDrafts([emptyCard()]);
    setTab('scheduled');
    fetchScheduled();
  };

  // ── Edit scheduled ────────────────────────────────────────────
  const startEdit = (q: QuoteSchedule) => {
    setEditingId(q.id);
    setEditForm({
      title: q.title, sloka: q.sloka, source: q.source,
      scheduled_date: q.scheduled_date, scheduled_time: q.scheduled_time,
    });
  };

  const saveEdit = async (id: string) => {
    const { scheduled_date, scheduled_time } = editForm;
    if (!scheduled_date || !scheduled_time) return;
    const dt = new Date(`${scheduled_date}T${scheduled_time}:00`);
    const payload = {
      ...editForm,
      scheduled_datetime: dt.toISOString(),
      day_name: DAYS[dt.getDay()],
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('quote_schedules').update(payload).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Quote updated!');
    setEditingId(null);
    fetchScheduled();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('quote_schedules').delete().eq('id', deleteTarget);
    setDeleting(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Deleted');
    setDeleteTarget(null);
    fetchScheduled();
  };

  const statusBadge = (s: QuoteSchedule['status']) => {
    const map = {
      scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      expired:   'bg-[#d0c5af]/10 text-[#d0c5af]/50 border-white/10',
    };
    return `px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[s]}`;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">Schedule Quotes</h3>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">Plan and schedule daily quotes in advance</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {(['new', 'scheduled'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-[#f2ca50] text-[#3c2f00]' : 'text-[#d0c5af]/60 hover:bg-white/5'}`}
            >
              {t === 'new' ? 'New Schedule' : 'Scheduled Quotes'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── NEW SCHEDULE TAB ── */}
          {tab === 'new' && (
            <>
              {drafts.map((card, idx) => (
                <div key={card.id} className="bg-[#0c1321] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#f2ca50]">Quote {idx + 1}</span>
                    {drafts.length > 1 && (
                      <button onClick={() => removeCard(card.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af]/40 transition-all">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Title *</label>
                      <input value={card.title} onChange={e => updateDraft(card.id, 'title', e.target.value)} placeholder="e.g. Morning Shloka" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Sloka *</label>
                      <textarea rows={3} value={card.sloka} onChange={e => updateDraft(card.id, 'sloka', e.target.value)} placeholder="Enter Sanskrit shloka..." className={`${inputCls} resize-none`} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Source</label>
                      <input value={card.source} onChange={e => updateDraft(card.id, 'source', e.target.value)} placeholder="e.g. Bhagavad Gita 2:47" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Date *</label>
                      <input type="date" value={card.date} onChange={e => updateDraft(card.id, 'date', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Time *</label>
                      <input type="time" value={card.time} onChange={e => updateDraft(card.id, 'time', e.target.value)} className={inputCls} />
                    </div>
                    {card.date && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-[#d0c5af]/40">
                          Day: <span className="text-[#f2ca50]">{DAYS[new Date(`${card.date}T${card.time}`).getDay()]}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addCard}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#f2ca50]/30 text-[#f2ca50]/60 text-xs font-semibold hover:border-[#f2ca50]/60 hover:text-[#f2ca50] transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Another Quote
              </button>
            </>
          )}

          {/* ── SCHEDULED QUOTES TAB ── */}
          {tab === 'scheduled' && (
            loadingScheduled ? (
              <div className="flex items-center justify-center h-40">
                <span className="material-symbols-outlined animate-spin text-3xl text-[#f2ca50]">progress_activity</span>
              </div>
            ) : scheduled.length === 0 ? (
              <div className="text-center py-16 text-[#d0c5af]/40 text-sm">No scheduled quotes yet.</div>
            ) : (
              <div className="space-y-3">
                {scheduled.map(q => (
                  <div key={q.id} className="bg-[#0c1321] border border-white/10 rounded-2xl p-4">
                    {editingId === q.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className={labelCls}>Title</label>
                            <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Sloka</label>
                            <textarea rows={3} value={editForm.sloka || ''} onChange={e => setEditForm(f => ({ ...f, sloka: e.target.value }))} className={`${inputCls} resize-none`} />
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Source</label>
                            <input value={editForm.source || ''} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Date</label>
                            <input type="date" value={editForm.scheduled_date || ''} onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Time</label>
                            <input type="time" value={editForm.scheduled_time || ''} onChange={e => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))} className={inputCls} />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
                          <button onClick={() => saveEdit(q.id)} className="flex-1 py-2 rounded-xl bg-[#f2ca50] text-[#3c2f00] text-xs font-bold hover:brightness-110 transition-all">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={statusBadge(q.status)}>{q.status}</span>
                            <span className="text-[10px] text-[#d0c5af]/40">{q.day_name} · {q.scheduled_date} {q.scheduled_time}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#dce2f6] truncate">{q.title || '—'}</p>
                          <p className="text-[11px] text-[#d0c5af]/60 line-clamp-2">{q.sloka}</p>
                          {q.source && <p className="text-[10px] text-[#d0c5af]/40 italic">{q.source}</p>}
                        </div>
                        {q.status === 'scheduled' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(q)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af]/50 transition-all">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => setDeleteTarget(q.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af]/50 transition-all">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {tab === 'new' && (
          <div className="px-6 pb-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              <span className="material-symbols-outlined text-sm">schedule</span>
              {saving ? 'Saving...' : `Schedule ${drafts.length} Quote${drafts.length > 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#19202e] border border-rose-500/20 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-rose-400 text-2xl">delete_forever</span>
            </div>
            <div className="text-center">
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6]">Delete Scheduled Quote?</h4>
              <p className="text-xs text-[#d0c5af]/60 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

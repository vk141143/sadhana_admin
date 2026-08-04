import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { uploadToR2 } from '../../services/r2Client';

interface Emotion {
  id: string;
  name: string;
  tagline: string;
  card_image_url: string;
  banner_image_url: string;
  outside_image_url: string;
  gita_sanskrit: string;
  gita_reference: string;
  gita_transliteration: string;
  gita_translation: string;
  gita_image_url: string;
  what_it_means: string;
  means_image_url: string;
  example_text: string;
  example_image_url: string;
  how_to_overcome: { title: string; sub: string }[];
  mantra_sanskrit: string;
  mantra_transliteration: string;
  mantra_meaning: string;
  mantra_image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY_FORM: Omit<Emotion, 'id' | 'created_at'> = {
  name: '', tagline: '',
  card_image_url: '', banner_image_url: '', outside_image_url: '',
  gita_sanskrit: '', gita_reference: '', gita_transliteration: '', gita_translation: '', gita_image_url: '',
  what_it_means: '', means_image_url: '',
  example_text: '', example_image_url: '',
  how_to_overcome: [
    { title: '', sub: '' }, { title: '', sub: '' },
    { title: '', sub: '' }, { title: '', sub: '' },
  ],
  mantra_sanskrit: '', mantra_transliteration: '', mantra_meaning: '', mantra_image_url: '',
  is_active: true, sort_order: 0,
};

const STEPS = [
  { label: 'Basic Info', icon: 'info' },
  { label: 'Images', icon: 'image' },
  { label: 'Bhagavad Gita', icon: 'menu_book' },
  { label: 'What It Means', icon: 'psychology' },
  { label: 'Example', icon: 'lightbulb' },
  { label: 'How to Overcome', icon: 'self_improvement' },
  { label: 'Mantra', icon: 'spa' },
];

const inputCls = "w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none";
const labelCls = "text-xs font-semibold text-[#f2ca50] block mb-1";

export const EmotionsView: React.FC = () => {
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<'next' | 'prev'>('next');
  const [visible, setVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadField, setPendingUploadField] = useState<string | null>(null);

  useEffect(() => { fetchEmotions(); }, []);

  const fetchEmotions = async () => {
    setLoading(true);
    const { data } = await supabase.from('emotions').select('*').order('sort_order', { ascending: true });
    const rows = (data as Emotion[]) || [];
    // Supabase may return how_to_overcome as a JSON string — parse it on every row
    const normalized = rows.map((e) => ({
      ...e,
      how_to_overcome: parseHowToOvercome(e.how_to_overcome),
    }));
    setEmotions(normalized);
    setLoading(false);
  };

  const parseHowToOvercome = (raw: any): { title: string; sub: string }[] => {
    const fallback = [{ title: '', sub: '' }, { title: '', sub: '' }, { title: '', sub: '' }, { title: '', sub: '' }];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure exactly 4 items, pad if needed
        const items = parsed.map((a: any) => ({ title: a.title || '', sub: a.sub || '' }));
        while (items.length < 4) items.push({ title: '', sub: '' });
        return items.slice(0, 4);
      }
    } catch (_) {}
    return fallback;
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, how_to_overcome: [{ title: '', sub: '' }, { title: '', sub: '' }, { title: '', sub: '' }, { title: '', sub: '' }] });
    setEditId(null);
    setStep(0);
    setShowWizard(true);
  };

  const openEdit = (emotion: Emotion) => {
    const { id, created_at, ...rest } = emotion;
    setForm({
      ...rest,
      how_to_overcome: parseHowToOvercome(rest.how_to_overcome),
    });
    setEditId(id);
    setStep(0);
    setShowWizard(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('emotions').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    fetchEmotions();
  };

  const goStep = (dir: 'next' | 'prev') => {
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setStep((s) => dir === 'next' ? s + 1 : s - 1);
      setVisible(true);
    }, 180);
  };

  const handleSave = async () => {
    setSaving(true);
    // Strip fields not in the emotions table schema
    const { ...payload } = form;
    let error;
    if (editId) {
      // emotions table has no updated_at column — do not include it
      ({ error } = await supabase.from('emotions').update(payload as any).eq('id', editId));
    } else {
      ({ error } = await supabase.from('emotions').insert(payload as any));
    }
    setSaving(false);
    if (error) { alert(error.message); return; }
    setShowWizard(false);
    fetchEmotions();
  };

  const handleUpload = async (file: File, field: string, subfolder: string) => {
    setUploadingField(field);
    try {
      const publicUrl = await uploadToR2(file, subfolder);
      setForm((f) => ({ ...f, [field]: publicUrl }));
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
    setUploadingField(null);
  };

  const triggerUpload = (field: string) => {
    setPendingUploadField(field);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadField) return;
    // Maps form field -> R2 subfolder under sanatana-content/images/banners/
    const folderMap: Record<string, string> = {
      card_image_url: 'cards',
      banner_image_url: 'banners',
      outside_image_url: 'outside',
      gita_image_url: 'gita',
      means_image_url: 'means',
      example_image_url: 'examples',
      mantra_image_url: 'mantras',
    };
    handleUpload(file, pendingUploadField, folderMap[pendingUploadField] || 'misc');
    e.target.value = '';
  };

  const ImageField = ({ field, label }: { field: string; label: string }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <input type="text" value={(form as any)[field] || ''} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          placeholder="Paste URL or upload to R2..." className={inputCls} />
        <button type="button" onClick={() => triggerUpload(field)} disabled={!!uploadingField}
          className="px-3 py-2 rounded-xl bg-[#232a39] border border-white/10 text-[#f2ca50] text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-50">
          {uploadingField === field
            ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            : <span className="material-symbols-outlined text-sm">cloud_upload</span>}
          {uploadingField === field ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {(form as any)[field] && (
        <img src={(form as any)[field]} alt={label} className="mt-2 h-16 rounded-lg object-cover border border-white/10" />
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Emotion Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anger, Fear, Peace" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Short gold uppercase text below the name" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={inputCls} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-[#0c1321] text-[#f2ca50] focus:ring-[#f2ca50]" />
              <label htmlFor="is_active" className="text-xs font-semibold text-[#dce2f6]">Active (visible in app)</label>
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <ImageField field="card_image_url" label="Card Image → R2: images/banners/cards/" />
          <ImageField field="banner_image_url" label="Banner Image → R2: images/banners/banners/" />
          <ImageField field="outside_image_url" label="Outside Image → R2: images/banners/outside/" />
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Sanskrit Shloka</label>
            <textarea rows={3} value={form.gita_sanskrit} onChange={(e) => setForm({ ...form, gita_sanskrit: e.target.value })} placeholder="Sanskrit text..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reference</label>
            <input type="text" value={form.gita_reference} onChange={(e) => setForm({ ...form, gita_reference: e.target.value })} placeholder="e.g. Bhagavad Gita 2.62" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Transliteration</label>
            <textarea rows={2} value={form.gita_transliteration} onChange={(e) => setForm({ ...form, gita_transliteration: e.target.value })} placeholder="Roman transliteration..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Translation / Meaning</label>
            <textarea rows={3} value={form.gita_translation} onChange={(e) => setForm({ ...form, gita_translation: e.target.value })} placeholder="English meaning..." className={inputCls} />
          </div>
          <ImageField field="gita_image_url" label="Gita Section Image → R2: images/banners/gita/" />
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Explanation</label>
            <textarea rows={5} value={form.what_it_means} onChange={(e) => setForm({ ...form, what_it_means: e.target.value })} placeholder="What this emotion means..." className={inputCls} />
          </div>
          <ImageField field="means_image_url" label="Illustration Image → R2: images/banners/means/" />
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Example Text</label>
            <textarea rows={5} value={form.example_text} onChange={(e) => setForm({ ...form, example_text: e.target.value })} placeholder="Real-life example scenario..." className={inputCls} />
          </div>
          <ImageField field="example_image_url" label="Example Image → R2: images/banners/examples/" />
        </div>
      );
      case 5: return (
        <div className="space-y-5">
          <p className="text-xs text-[#d0c5af]/60">4 circular numbered steps shown in the app as a grid.</p>
          {form.how_to_overcome.map((action, i) => (
            <div key={i} className="bg-[#0c1321] rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-[#f2ca50] text-[#3c2f00] flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <span className="text-xs font-semibold text-[#f2ca50]">Action {i + 1}</span>
              </div>
              <div>
                <label className={labelCls}>Title</label>
                <input type="text" value={action.title} onChange={(e) => {
                  const updated = [...form.how_to_overcome];
                  updated[i] = { ...updated[i], title: e.target.value };
                  setForm({ ...form, how_to_overcome: updated });
                }} placeholder="e.g. Breathe Deeply" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sub-text</label>
                <input type="text" value={action.sub} onChange={(e) => {
                  const updated = [...form.how_to_overcome];
                  updated[i] = { ...updated[i], sub: e.target.value };
                  setForm({ ...form, how_to_overcome: updated });
                }} placeholder="e.g. 4-7-8 technique" className={inputCls} />
              </div>
            </div>
          ))}
        </div>
      );
      case 6: return (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Sanskrit Mantra</label>
            <textarea rows={3} value={form.mantra_sanskrit} onChange={(e) => setForm({ ...form, mantra_sanskrit: e.target.value })} placeholder="Sanskrit mantra text..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Transliteration</label>
            <input type="text" value={form.mantra_transliteration} onChange={(e) => setForm({ ...form, mantra_transliteration: e.target.value })} placeholder="Roman transliteration..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Meaning</label>
            <textarea rows={2} value={form.mantra_meaning} onChange={(e) => setForm({ ...form, mantra_meaning: e.target.value })} placeholder="Meaning of the mantra..." className={inputCls} />
          </div>
          <ImageField field="mantra_image_url" label="Mantra Image → R2: images/banners/mantras/" />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Emotions</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            <span className="text-[#f2ca50] font-semibold">{emotions.length}</span> emotions configured
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm shadow-lg hover:brightness-110 transition-all active:scale-95">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Emotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: emotions.length, color: 'text-[#f2ca50]' },
          { label: 'Active', value: emotions.filter((e) => e.is_active).length, color: 'text-emerald-400' },
          { label: 'Hidden', value: emotions.filter((e) => !e.is_active).length, color: 'text-rose-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#19202e] p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">{label}</p>
            <h3 className={`text-2xl font-bold font-serif-headline mt-1 ${color}`}>{value}</h3>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#19202e] border-b-2 border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
                  <th className="py-4 px-4">Image</th>
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4">Tagline</th>
                  <th className="py-4 px-4">Sort</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {emotions.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-[#d0c5af]/50 text-sm">No emotions yet. Click "Create Emotion" to add one.</td></tr>
                ) : emotions.map((emotion) => (
                  <tr key={emotion.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#232a39] border border-white/10 flex items-center justify-center">
                        {emotion.card_image_url
                          ? <img src={emotion.card_image_url} alt={emotion.name} className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-[#f2ca50] text-xl">psychology</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors">{emotion.name}</span>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]/70 max-w-[200px] truncate">{emotion.tagline || '—'}</td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{emotion.sort_order}</td>
                    <td className="py-4 px-4">
                      {emotion.is_active
                        ? <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">Active</span>
                        : <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">Hidden</span>}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(emotion)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(emotion.id, emotion.name)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl shadow-2xl my-8 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
              <div>
                <h3 className="font-serif-headline text-xl font-bold text-[#f2ca50]">
                  {editId ? 'Edit Emotion' : 'Create Emotion'}
                </h3>
                <p className="text-xs text-[#d0c5af]/60 mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Step Progress Bar */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <React.Fragment key={i}>
                    <button onClick={() => { setAnimDir(i > step ? 'next' : 'prev'); setVisible(false); setTimeout(() => { setStep(i); setVisible(true); }, 180); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${i === step ? 'bg-[#f2ca50] text-[#3c2f00]' : i < step ? 'bg-[#f2ca50]/20 text-[#f2ca50]' : 'bg-[#0c1321] text-[#d0c5af]/50'}`}>
                      <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
                      <span className="hidden md:inline">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-[#f2ca50]/50' : 'bg-white/10'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content with animation */}
            <div className="px-6 py-6 min-h-[320px]">
              {/* Step title with typewriter feel */}
              <div className={`mb-5 transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : animDir === 'next' ? 'opacity-0 translate-y-3' : 'opacity-0 -translate-y-3'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#f2ca50]/10 border border-[#f2ca50]/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#f2ca50] text-base">{STEPS[step].icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#dce2f6]">{STEPS[step].label}</h4>
                    <p className="text-[10px] text-[#d0c5af]/50">
                      {['Fill in the basic details for this emotion', 'Upload or paste image URLs for each section', 'Add the Bhagavad Gita reference for this emotion', 'Explain what this emotion means in context', 'Provide a real-life example scenario', 'Define 4 actionable steps to overcome this emotion', 'Add the mantra for inner peace'][step]}
                    </p>
                  </div>
                </div>
                {renderStep()}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-6 pb-6 flex items-center justify-between border-t border-white/10 pt-4">
              <button onClick={() => goStep('prev')} disabled={step === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back
              </button>

              <span className="text-xs text-[#d0c5af]/40">{step + 1} / {STEPS.length}</span>

              {step < STEPS.length - 1 ? (
                <button onClick={() => goStep('next')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all active:scale-95">
                  Next
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving || !form.name}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  <span className="material-symbols-outlined text-base">check</span>
                  {editId ? 'Update Emotion' : 'Save Emotion'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

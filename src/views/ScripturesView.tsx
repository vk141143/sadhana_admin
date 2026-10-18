import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadScriptureImageToR2, uploadChapterImageToR2 } from '../services/r2Client';
import { scriptureService, chapterService, slokaService, fetchSlokaJson } from '../services/contentService';
import { Scripture, Chapter, SlokaRecord, SlokaJson } from '../types';

const inputCls =
  'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';
const labelCls = 'text-[10px] font-semibold text-[#f2ca50] block mb-1';

const LANGS = ['english', 'hindi', 'telugu', 'tamil', 'kannada', 'malayalam', 'sanskrit'];
const STATUS_OPTS: Array<'Draft' | 'Published' | 'Archived'> = ['Draft', 'Published', 'Archived'];

function statusColor(s: string) {
  if (s === 'Published') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (s === 'Archived') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-6 right-6 z-[300] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2
      ${type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
      <span className="material-symbols-outlined text-base">{type === 'success' ? 'check_circle' : 'error'}</span>
      {msg}
    </div>
  );
}

// ── Image uploader ────────────────────────────────────────────
type UploadFn = (file: File, folder: string) => Promise<string>;
function ImageUploader({ url, onChange, folder, uploadFn }: {
  url: string;
  onChange: (u: string) => void;
  folder: string;
  uploadFn: UploadFn;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadFn(file, folder);
      onChange(uploaded);
    } catch (e: any) { alert(e.message); }
    setUploading(false);
  };

  return (
    <div onClick={() => !uploading && ref.current?.click()}
      className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
        ${url ? 'border-[#f2ca50]/40' : 'border-white/10 hover:border-[#f2ca50]/40 hover:bg-[#f2ca50]/5'}`}>
      {url ? (
        <div className="relative">
          <img src={url} alt="cover" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-xs font-bold text-white">Replace</span>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-500 transition-all">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ) : (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-[#d0c5af]/40">
          {uploading
            ? <><span className="material-symbols-outlined text-4xl animate-spin text-[#f2ca50]">progress_activity</span><span className="text-xs text-[#f2ca50]">Uploading to R2…</span></>
            : <><span className="material-symbols-outlined text-4xl">add_photo_alternate</span><span className="text-xs font-semibold">Click to upload (WebP / PNG / JPG)</span></>}
        </div>
      )}
      <input ref={ref} type="file" accept="image/webp,image/png,image/jpeg,image/jpg" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Scripture Modal (Add / Edit) ──────────────────────────────
function ScriptureModal({ item, onClose, onSaved, showToast }: {
  item: Scripture | null;
  onClose: () => void;
  onSaved: (s: Scripture) => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.cover_image_url ?? '');
  const [status, setStatus] = useState<Scripture['status']>(item?.status ?? 'Draft');
  const [saving, setSaving] = useState(false);
  const tempFolder = useRef(`tmp-${Date.now()}`).current;
  const folder = item?.id ?? tempFolder;

  const save = async () => {
    if (!name.trim()) { showToast('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const saved = await scriptureService.save({ ...(item ?? {}), name, description, cover_image_url: coverUrl, status });
      onSaved(saved);
      showToast(item ? 'Scripture updated!' : 'Scripture added!');
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">{item ? 'Edit Scripture' : 'Add Scripture'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Cover Image (Cloudflare R2)</label>
            <ImageUploader url={coverUrl} onChange={setCoverUrl} folder={folder} uploadFn={uploadScriptureImageToR2} />
          </div>
          <div>
            <label className={labelCls}>Scripture Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bhagavad Gita" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description…" className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Scripture['status'])} className={inputCls}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {coverUrl && (
            <div className="bg-[#0c1321] rounded-xl px-3 py-2 border border-white/10">
              <p className="text-[10px] text-[#d0c5af]/40 mb-0.5">Stored URL (Supabase)</p>
              <p className="text-[10px] text-[#dce2f6] break-all">{coverUrl}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-white/10 pt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50">
            {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Saving…' : item ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chapter Modal ─────────────────────────────────────────────
function ChapterModal({ scriptureId, scriptureName, item, onClose, onSaved, showToast }: {
  scriptureId: string;
  scriptureName: string;
  item: Chapter | null;
  onClose: () => void;
  onSaved: (c: Chapter) => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [chapterNumber, setChapterNumber] = useState(item?.chapter_number ?? 1);
  const [title, setTitle] = useState(item?.title ?? '');
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [status, setStatus] = useState<Chapter['status']>(item?.status ?? 'Draft');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const saved = await chapterService.save({
        ...(item ?? {}),
        scripture_id: scriptureId,
        chapter_number: chapterNumber,
        title, subtitle, description,
        image_url: imageUrl,
        status,
      });
      onSaved(saved);
      showToast(item ? 'Chapter updated!' : 'Chapter added!');
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">{item ? 'Edit Chapter' : 'Add Chapter'}</h3>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">Scripture → <span className="text-[#f2ca50]">{scriptureName}</span> · DB: <span className="text-emerald-400">chapters</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={labelCls}>Chapter Image (Cloudflare R2)</label>
            <ImageUploader url={imageUrl} onChange={setImageUrl} folder={scriptureId} uploadFn={uploadChapterImageToR2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Chapter Number *</label>
              <input type="number" min={1} value={chapterNumber} onChange={e => setChapterNumber(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Chapter['status'])} className={inputCls}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chapter title" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitle" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Chapter description…" className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-white/10 pt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50">
            {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Saving…' : item ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sloka Modal ───────────────────────────────────────────────
const emptyLang = () => ({ translation: '', meaning: '', explanation: '', example: '' });

function SlokaModal({ chapterId, chapterTitle, scriptureName, item, onClose, onSaved, showToast }: {
  chapterId: string;
  chapterTitle: string;
  scriptureName: string;
  item: SlokaRecord | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [verseNumber, setVerseNumber] = useState(item?.verse_number ?? 1);
  const [verseId, setVerseId] = useState(item?.verse_id ?? '');
  const [devanagari, setDevanagari] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [langs, setLangs] = useState<Record<string, ReturnType<typeof emptyLang>>>(
    Object.fromEntries(LANGS.map(l => [l, emptyLang()]))
  );
  const [activeLang, setActiveLang] = useState('english');
  const [loading, setLoading] = useState(!!item);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    fetchSlokaJson(item.json_url).then(j => {
      setVerseNumber(j.verse_number);
      setVerseId(j.id);
      setDevanagari(j.sanskrit.devanagari);
      setTransliteration(j.sanskrit.transliteration);
      const merged = { ...Object.fromEntries(LANGS.map(l => [l, emptyLang()])), ...j.languages };
      setLangs(merged);
      setLoading(false);
    }).catch(e => { showToast(e.message, 'error'); setLoading(false); });
  }, []);

  const setLangField = (lang: string, field: string, val: string) =>
    setLangs(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: val } }));

  const save = async () => {
    if (!verseId.trim()) { showToast('Verse ID is required', 'error'); return; }
    setSaving(true);
    try {
      const json: SlokaJson = {
        id: verseId,
        verse_number: verseNumber,
        sanskrit: { devanagari, transliteration },
        languages: langs,
      };
      if (item) {
        await slokaService.update(item, json);
      } else {
        await slokaService.add(chapterId, json);
      }
      onSaved();
      showToast(item ? 'Sloka updated!' : 'Sloka added!');
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-start justify-between shrink-0">
          <div>
            <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">{item ? 'Edit Sloka' : 'Add Sloka'}</h3>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">
              {scriptureName} → <span className="text-[#f2ca50]">{chapterTitle}</span> · DB: <span className="text-emerald-400">slokas</span> · JSON → <span className="text-blue-400">Cloudflare R2</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Verse meta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Verse Number *</label>
                <input type="number" min={1} value={verseNumber} onChange={e => setVerseNumber(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Verse ID * <span className="text-[#d0c5af]/40 font-normal">(e.g. BG.1.1)</span></label>
                <input value={verseId} onChange={e => setVerseId(e.target.value)} placeholder="BG.1.1" className={inputCls} disabled={!!item} />
              </div>
            </div>

            {/* Sanskrit */}
            <div className="bg-[#0c1321] rounded-2xl p-4 border border-white/10 space-y-3">
              <p className="text-[10px] font-bold text-[#f2ca50] uppercase tracking-widest">Sanskrit</p>
              <div>
                <label className={labelCls}>Devanagari</label>
                <textarea value={devanagari} onChange={e => setDevanagari(e.target.value)} rows={2} placeholder="ॐ …" className={inputCls + ' resize-none font-serif'} />
              </div>
              <div>
                <label className={labelCls}>Transliteration</label>
                <textarea value={transliteration} onChange={e => setTransliteration(e.target.value)} rows={2} placeholder="om …" className={inputCls + ' resize-none'} />
              </div>
            </div>

            {/* Language tabs */}
            <div>
              <p className="text-[10px] font-bold text-[#f2ca50] uppercase tracking-widest mb-3">Content JSON — Languages</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {LANGS.map(l => (
                  <button key={l} onClick={() => setActiveLang(l)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-all
                      ${activeLang === l ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-[#0c1321] text-[#d0c5af] border border-white/10 hover:border-[#f2ca50]/40'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="bg-[#0c1321] rounded-2xl p-4 border border-white/10 space-y-3">
                {(['translation', 'meaning', 'explanation', 'example'] as const).map(field => (
                  <div key={field}>
                    <label className={labelCls + ' capitalize'}>{field}</label>
                    <textarea
                      value={langs[activeLang]?.[field] ?? ''}
                      onChange={e => setLangField(activeLang, field, e.target.value)}
                      rows={field === 'explanation' ? 3 : 2}
                      placeholder={`${field} in ${activeLang}…`}
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* DB info box */}
            <div className="bg-[#0c1321] rounded-xl px-4 py-3 border border-white/10 text-[10px] text-[#d0c5af]/50 space-y-1">
              <p>📦 <span className="text-emerald-400 font-semibold">slokas</span> table → stores verse_id, verse_number, json_url, chapter_id</p>
              <p>☁️ JSON content uploaded to <span className="text-blue-400 font-semibold">Cloudflare R2</span> at <code>slokas/{'{verseId}'}.json</code></p>
              <p>🔗 Public URL stored in <span className="text-[#f2ca50] font-semibold">Supabase</span> <code>slokas.json_url</code></p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-white/10 pt-4 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={save} disabled={saving || loading} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50">
            {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Saving…' : item ? 'Update Sloka' : 'Save Sloka'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chapters Panel ────────────────────────────────────────────
function ChaptersPanel({ scripture, onClose, showToast }: {
  scripture: Scripture;
  onClose: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterModal, setChapterModal] = useState<{ open: boolean; item: Chapter | null }>({ open: false, item: null });
  const [slokaPanel, setSlokaPanel] = useState<Chapter | null>(null);

  const load = async () => {
    setLoading(true);
    try { setChapters(await chapterService.list(scripture.id)); }
    catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteChapter = async (c: Chapter) => {
    if (!confirm(`Delete chapter "${c.title}"? All slokas inside will also be deleted.`)) return;
    try { await chapterService.delete(c.id); showToast('Chapter deleted'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif-headline text-xl font-bold text-[#f2ca50]">{scripture.name}</h3>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">DB: <span className="text-emerald-400">chapters</span> · {chapters.length} chapters</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setChapterModal({ open: true, item: null })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-sm">add</span>Add Chapter
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
            </div>
          ) : chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#d0c5af]/40 gap-2">
              <span className="material-symbols-outlined text-5xl">menu_book</span>
              <p className="text-sm">No chapters yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chapters.map(c => (
                <div key={c.id} className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-[#f2ca50]/20 border border-transparent transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    {c.image_url && <img src={c.image_url} alt={c.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#dce2f6] truncate">Ch. {c.chapter_number} — {c.title}</p>
                      {c.subtitle && <p className="text-[10px] text-[#d0c5af]/50 truncate">{c.subtitle}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusColor(c.status)}`}>{c.status}</span>
                        <span className="text-[10px] text-[#d0c5af]/40">{c.sloka_count} slokas</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setSlokaPanel(c)}
                      className="px-3 py-1.5 rounded-lg bg-[#f2ca50]/10 text-[#f2ca50] text-[10px] font-bold hover:bg-[#f2ca50]/20 transition-all">
                      Slokas
                    </button>
                    <button onClick={() => setChapterModal({ open: true, item: c })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => deleteChapter(c)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {chapterModal.open && (
        <ChapterModal
          scriptureId={scripture.id}
          scriptureName={scripture.name}
          item={chapterModal.item}
          onClose={() => setChapterModal({ open: false, item: null })}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {slokaPanel && (
        <SlokasPanel
          chapter={slokaPanel}
          scriptureName={scripture.name}
          onClose={() => setSlokaPanel(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Slokas Panel ──────────────────────────────────────────────
function SlokasPanel({ chapter, scriptureName, onClose, showToast }: {
  chapter: Chapter;
  scriptureName: string;
  onClose: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [slokas, setSlokas] = useState<SlokaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [slokaModal, setSlokaModal] = useState<{ open: boolean; item: SlokaRecord | null }>({ open: false, item: null });

  const load = async () => {
    setLoading(true);
    try { setSlokas(await slokaService.list(chapter.id)); }
    catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteSloka = async (s: SlokaRecord) => {
    if (!confirm(`Delete sloka "${s.verse_id}"?`)) return;
    try { await slokaService.delete(s); showToast('Sloka deleted'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">Ch. {chapter.chapter_number} — {chapter.title}</h3>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">
              {scriptureName} · DB: <span className="text-emerald-400">slokas</span> · JSON → <span className="text-blue-400">R2</span> · {slokas.length} slokas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSlokaModal({ open: true, item: null })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-sm">add</span>Add Sloka
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
            </div>
          ) : slokas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#d0c5af]/40 gap-2">
              <span className="material-symbols-outlined text-5xl">auto_stories</span>
              <p className="text-sm">No slokas yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slokas.map(s => (
                <div key={s.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-[#f2ca50]/20 border border-transparent transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#dce2f6]">v{s.verse_number} · <span className="text-[#f2ca50]">{s.verse_id}</span></p>
                    <p className="text-[10px] text-[#d0c5af]/40 truncate mt-0.5">{s.json_url}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold mt-1 inline-block ${statusColor(s.status)}`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setSlokaModal({ open: true, item: s })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => deleteSloka(s)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {slokaModal.open && (
        <SlokaModal
          chapterId={chapter.id}
          chapterTitle={chapter.title}
          scriptureName={scriptureName}
          item={slokaModal.item}
          onClose={() => setSlokaModal({ open: false, item: null })}
          onSaved={load}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Main ScripturesView ───────────────────────────────────────
export const ScripturesView: React.FC = () => {
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [scriptureModal, setScriptureModal] = useState<{ open: boolean; item: Scripture | null }>({ open: false, item: null });
  const [chaptersPanel, setChaptersPanel] = useState<Scripture | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | Scripture['status']>('All');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try { setScriptures(await scriptureService.list()); }
    catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteScripture = async (s: Scripture) => {
    if (!confirm(`Delete "${s.name}"? All chapters and slokas will be deleted.`)) return;
    try { await scriptureService.delete(s.id); showToast('Scripture deleted'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const filtered = scriptures.filter(s => filterStatus === 'All' || s.status === filterStatus);

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28 relative">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">Sacred Scriptures</h2>
          <p className="text-sm text-[#d0c5af]/80 mt-1">
            Manage scriptures, chapters & slokas. Images → <span className="text-blue-400">Cloudflare R2</span> · Metadata → <span className="text-emerald-400">Supabase</span>
          </p>
        </div>
        <button onClick={() => setScriptureModal({ open: true, item: null })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm hover:brightness-110 transition-all shadow-lg">
          <span className="material-symbols-outlined text-base">add</span>Add Scripture
        </button>
      </div>

      {/* Filter */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3">
        {(['All', ...STATUS_OPTS] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all
              ${filterStatus === s ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-[#19202e] text-[#d0c5af] hover:bg-white/10'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-60">
          <span className="material-symbols-outlined animate-spin text-5xl text-[#f2ca50]">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-[#d0c5af]/40 gap-3">
          <span className="material-symbols-outlined text-6xl">menu_book</span>
          <p>No scriptures found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(s => (
            <div key={s.id} className="glass-card rounded-2xl overflow-hidden border border-transparent hover:border-[#f2ca50]/20 transition-all flex flex-col">
              {s.cover_image_url
                ? <img src={s.cover_image_url} alt={s.name} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-[#0c1321] flex items-center justify-center text-[#d0c5af]/20"><span className="material-symbols-outlined text-5xl">menu_book</span></div>}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-serif-headline text-xl font-bold text-[#dce2f6]">{s.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${statusColor(s.status)}`}>{s.status}</span>
                </div>
                {s.description && <p className="text-xs text-[#d0c5af]/70 leading-relaxed mb-3 line-clamp-2">{s.description}</p>}
                <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                  <button onClick={() => setChaptersPanel(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f2ca50]/10 text-[#f2ca50] text-xs font-bold hover:bg-[#f2ca50]/20 transition-all">
                    <span className="material-symbols-outlined text-sm">menu_book</span>Chapters
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setScriptureModal({ open: true, item: s })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => deleteScripture(s)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {scriptureModal.open && (
        <ScriptureModal
          item={scriptureModal.item}
          onClose={() => setScriptureModal({ open: false, item: null })}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {chaptersPanel && (
        <ChaptersPanel
          scripture={chaptersPanel}
          onClose={() => setChaptersPanel(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

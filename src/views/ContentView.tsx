import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Scripture, Chapter, SlokaRecord, SlokaJson } from '../types';
import { scriptureService, chapterService, slokaService, fetchSlokaJson } from '../services/contentService';
import { uploadImageToR2, uploadScriptureImageToR2 } from '../services/r2Client';

type CmsStatus = 'Draft' | 'Published' | 'Archived';

const ipt = 'w-full bg-[#0c1321] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#dce2f6] outline-none focus:ring-1 focus:ring-[#f2ca50]';
const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) =>
  <button {...props} className={`px-4 py-2.5 rounded-xl text-xs font-bold ${className}`}>{children}</button>;
const Badge: React.FC<{ value: string }> = ({ value }) =>
  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${value === 'Published' ? 'bg-emerald-500/15 text-emerald-300' : value === 'Archived' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{value}</span>;
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
  <div className={`bg-[#19202e] border border-white/10 rounded-2xl shadow-xl ${className}`}>{children}</div>;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) =>
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
    <Card className={`w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-serif-headline text-xl font-bold text-[#f2ca50]">{title}</h3>
        <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
      </div>
      {children}
    </Card>
  </div>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) =>
  <label className="block text-xs font-semibold text-[#f2ca50]">{label}<div className="mt-1.5">{children}</div></label>;
const Spinner = () => <div className="flex items-center justify-center py-16"><span className="material-symbols-outlined animate-spin text-[#f2ca50] text-3xl">progress_activity</span></div>;

const LANGS = ['en', 'te', 'hi', 'kn', 'ml', 'ta'];

function validateSlokaJson(raw: string, scripture: Scripture, chapter: Chapter): SlokaJson {
  let v: SlokaJson;
  try { v = JSON.parse(raw); } catch { throw new Error('Invalid JSON syntax.'); }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Sloka JSON must be an object.');
  if (!Number.isInteger(v.verse_number) || v.verse_number < 1) throw new Error('verse_number must be a positive integer.');
  if (!v.id) throw new Error('Missing field: id');
  const match = v.id.match(/^([A-Za-z]{1,8})\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`id must be like BG.1.1, got: ${v.id}`);
  const prefix = scripture.name.split(' ').map(w => w[0]).join('').toUpperCase();
  if (match[1].toUpperCase() !== prefix) throw new Error(`id prefix must be "${prefix}" for ${scripture.name}`);
  if (Number(match[2]) !== chapter.chapter_number) throw new Error(`Chapter in id (${match[2]}) must be ${chapter.chapter_number}`);
  if (Number(match[3]) !== v.verse_number) throw new Error(`Verse in id (${match[3]}) must match verse_number (${v.verse_number})`);
  if (!v.sanskrit || typeof v.sanskrit !== 'object') throw new Error('Missing sanskrit object.');
  if (!v.sanskrit.devanagari?.trim() || !/[\u0900-\u097F]/u.test(v.sanskrit.devanagari)) throw new Error('Sanskrit devanagari must contain Devanagari text.');
  if (!v.sanskrit.transliteration?.trim() || !/[A-Za-z]/.test(v.sanskrit.transliteration)) throw new Error('Sanskrit transliteration must contain Latin text.');
  for (const lang of LANGS) {
    const l = v.languages?.[lang];
    if (!l) throw new Error(`Missing language block: ${lang}`);
    for (const f of ['translation', 'meaning', 'explanation', 'example'] as const) {
      if (typeof l[f] !== 'string' || !l[f].trim()) throw new Error(`languages.${lang}.${f} is empty`);
    }
  }
  if (Object.keys(v.languages || {}).some(lang => !LANGS.includes(lang))) throw new Error('languages contains an unsupported language.');
  return v;
}

export const ContentView: React.FC = () => {
  // ── navigation state ──────────────────────────────────────
  const [scripture, setScripture] = useState<Scripture | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);

  // ── data ──────────────────────────────────────────────────
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slokas, setSlokas] = useState<SlokaRecord[]>([]);

  // ── loading ───────────────────────────────────────────────
  const [loadingScriptures, setLoadingScriptures] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingSlokas, setLoadingSlokas] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── filters ───────────────────────────────────────────────
  const [term, setTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── notices ───────────────────────────────────────────────
  const [notice, setNotice] = useState('');

  // ── edit modals ───────────────────────────────────────────
  const [scriptureEdit, setScriptureEdit] = useState<Partial<Scripture> | null>(null);
  const [chapterEdit, setChapterEdit] = useState<Partial<Chapter> | null>(null);

  // ── delete confirm ────────────────────────────────────────
  const [removing, setRemoving] = useState<{ type: 'scripture' | 'chapter' | 'sloka'; item: any; label: string } | null>(null);

  // ── sloka modal ───────────────────────────────────────────
  const [slokaModal, setSlokaModal] = useState<{ mode: 'add' | 'edit' | 'view'; record?: SlokaRecord } | null>(null);
  const [slokaRaw, setSlokaRaw] = useState('');
  const [slokaErr, setSlokaErr] = useState('');
  const [slokaValid, setSlokaValid] = useState<SlokaJson | null>(null);
  const [slokaLoading, setSlokaLoading] = useState(false);
  const [slokaPreviews, setSlokaPreviews] = useState<Record<string, string>>({});
  const [chapterImageFile, setChapterImageFile] = useState<File | null>(null);
  const [scriptureImageFile, setScriptureImageFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── load scriptures ───────────────────────────────────────
  useEffect(() => {
    setLoadingScriptures(true);
    scriptureService.list()
      .then(setScriptures)
      .catch(e => setNotice(e.message))
      .finally(() => setLoadingScriptures(false));
  }, []);

  // ── load chapters when scripture changes ──────────────────
  useEffect(() => {
    if (!scripture) { setChapters([]); return; }
    setLoadingChapters(true);
    chapterService.list(scripture.id)
      .then(setChapters)
      .catch(e => setNotice(e.message))
      .finally(() => setLoadingChapters(false));
  }, [scripture]);

  // ── load slokas when chapter changes ─────────────────────
  const reloadSlokas = useCallback(async (chapterId: string) => {
    setLoadingSlokas(true);
    try {
      const records = await slokaService.list(chapterId);
      setSlokas(records);
      const previews = await Promise.all(records.map(async record => {
        try { return [record.id, (await fetchSlokaJson(record.json_url)).sanskrit.devanagari] as const; }
        catch { return [record.id, ''] as const; }
      }));
      setSlokaPreviews(Object.fromEntries(previews));
    }
    catch (e: any) { setNotice(e.message); }
    finally { setLoadingSlokas(false); }
  }, []);

  useEffect(() => {
    if (!chapter) { setSlokas([]); return; }
    reloadSlokas(chapter.id);
  }, [chapter, reloadSlokas]);

  const clearFilters = () => { setTerm(''); setStatusFilter(''); };

  // ── filtered lists ────────────────────────────────────────
  const filteredScriptures = useMemo(() =>
    scriptures.filter(x => (!term || x.name.toLowerCase().includes(term.toLowerCase())) && (!statusFilter || x.status === statusFilter)),
    [scriptures, term, statusFilter]);

  const filteredChapters = useMemo(() =>
    chapters.filter(x => (!term || x.title.toLowerCase().includes(term.toLowerCase())) && (!statusFilter || x.status === statusFilter)),
    [chapters, term, statusFilter]);

  const filteredSlokas = useMemo(() =>
    slokas.filter(x => (!term || x.verse_id.toLowerCase().includes(term.toLowerCase())) && (!statusFilter || x.status === statusFilter))
      .sort((a, b) => a.verse_number - b.verse_number),
    [slokas, term, statusFilter]);

  // ── scripture save ────────────────────────────────────────
  const saveScripture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptureEdit?.name?.trim()) return;
    setSaving(true);
    try {
      let cover_image_url = scriptureEdit.cover_image_url || '';
      if (scriptureImageFile) {
        // For new scriptures we need a temp id derived from name to build the key,
        // then after insert we get the real UUID — but we upload first using a
        // slug so the key is still deterministic per scripture name.
        const tempId = scriptureEdit.id || scriptureEdit.name!.trim().toLowerCase().replace(/\s+/g, '-');
        cover_image_url = await uploadScriptureImageToR2(scriptureImageFile, tempId);
      }
      const saved = await scriptureService.save({ ...scriptureEdit, cover_image_url });
      // If this was a new scripture, re-upload with the real UUID so the key is correct.
      if (scriptureImageFile && !scriptureEdit.id) {
        const finalUrl = await uploadScriptureImageToR2(scriptureImageFile, saved.id);
        await scriptureService.save({ ...saved, cover_image_url: finalUrl });
        saved.cover_image_url = finalUrl;
      }
      setScriptures(xs => xs.some(x => x.id === saved.id) ? xs.map(x => x.id === saved.id ? saved : x) : [saved, ...xs]);
      setScriptureEdit(null);
      setScriptureImageFile(null);
    } catch (e: any) { setNotice(e.message); }
    finally { setSaving(false); }
  };

  // ── chapter save ──────────────────────────────────────────
  const saveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scripture || !chapterEdit?.title?.trim() || !chapterEdit.chapter_number) return;
    if (chapters.some(x => x.scripture_id === scripture.id && x.chapter_number === Number(chapterEdit.chapter_number) && x.id !== chapterEdit.id))
      return setNotice('Duplicate chapter number.');
    setSaving(true);
    try {
      let imageUrl = chapterEdit.image_url || '';
      if (chapterImageFile) imageUrl = await uploadImageToR2(chapterImageFile, `scriptures/${scripture.id}/chapters`);
      const saved = await chapterService.save({ ...chapterEdit, image_url: imageUrl, scripture_id: scripture.id, chapter_number: Number(chapterEdit.chapter_number) });
      setChapters(xs => xs.some(x => x.id === saved.id) ? xs.map(x => x.id === saved.id ? saved : x) : [...xs, saved]);
      setChapterEdit(null);
      setChapterImageFile(null);
    } catch (e: any) { setNotice(e.message); }
    finally { setSaving(false); }
  };

  // ── delete confirm ────────────────────────────────────────
  const confirmDelete = async () => {
    if (!removing) return;
    try {
      if (removing.type === 'scripture') {
        await scriptureService.delete(removing.item.id);
        setScriptures(xs => xs.filter(x => x.id !== removing.item.id));
        setScripture(null); setChapter(null);
      } else if (removing.type === 'chapter') {
        await chapterService.delete(removing.item.id);
        setChapters(xs => xs.filter(x => x.id !== removing.item.id));
        setChapter(null);
      } else {
        await slokaService.delete(removing.item as SlokaRecord);
        setSlokas(xs => xs.filter(x => x.id !== removing.item.id));
        if (chapter) setChapters(xs => xs.map(x => x.id === chapter.id ? { ...x, sloka_count: Math.max(0, x.sloka_count - 1) } : x));
      }
    } catch (e: any) { setNotice(e.message); }
    setRemoving(null);
  };

  // ── sloka modal open ──────────────────────────────────────
  const openAddSloka = () => { setSlokaRaw(''); setSlokaErr(''); setSlokaValid(null); setSlokaModal({ mode: 'add' }); };

  const openViewSloka = async (rec: SlokaRecord) => {
    setSlokaModal({ mode: 'view', record: rec });
    setSlokaRaw(''); setSlokaErr(''); setSlokaValid(null); setSlokaLoading(true);
    try { setSlokaRaw(JSON.stringify(await fetchSlokaJson(rec.json_url), null, 2)); }
    catch (e: any) { setSlokaErr(e.message); }
    finally { setSlokaLoading(false); }
  };

  const openEditSloka = async (rec: SlokaRecord) => {
    setSlokaModal({ mode: 'edit', record: rec });
    setSlokaRaw(''); setSlokaErr(''); setSlokaValid(null); setSlokaLoading(true);
    try { setSlokaRaw(JSON.stringify(await fetchSlokaJson(rec.json_url), null, 2)); }
    catch (e: any) { setSlokaErr(e.message); }
    finally { setSlokaLoading(false); }
  };

  const handleValidate = () => {
    if (!scripture || !chapter) return;
    try { setSlokaValid(validateSlokaJson(slokaRaw, scripture, chapter)); setSlokaErr(''); }
    catch (e: any) { setSlokaValid(null); setSlokaErr(e.message); }
  };

  const handleSaveSloka = async () => {
    if (!scripture || !chapter) return;
    let json: SlokaJson;
    try { json = validateSlokaJson(slokaRaw, scripture, chapter); }
    catch (e: any) { setSlokaErr(e.message); return; }
    setSaving(true);
    try {
      if (slokaModal?.mode === 'edit' && slokaModal.record) {
        const updated = await slokaService.update(slokaModal.record, json);
        setSlokas(xs => xs.map(x => x.id === updated.id ? updated : x));
        setNotice(`Sloka ${json.id} updated.`);
      } else {
        const added = await slokaService.add(chapter.id, json);
        setSlokas(xs => [...xs, added]);
        setChapters(xs => xs.map(x => x.id === chapter.id ? { ...x, sloka_count: x.sloka_count + 1 } : x));
        setNotice(`Sloka ${json.id} saved.`);
      }
      setSlokaModal(null);
    } catch (e: any) { setSlokaErr(e.message); }
    finally { setSaving(false); }
  };

  // ── shared toolbar ────────────────────────────────────────
  const Toolbar = ({ placeholder }: { placeholder: string }) => (
    <Card className="p-4 flex flex-col lg:flex-row gap-3 justify-between">
      <input className={ipt} value={term} onChange={e => setTerm(e.target.value)} placeholder={placeholder} />
      <div className="flex gap-2">
        <select className={ipt} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option>Draft</option><option>Published</option><option>Archived</option>
        </select>
        <Btn className="border border-white/10 text-[#d0c5af]" onClick={clearFilters}>Clear</Btn>
      </div>
    </Card>
  );

  // ── shared table ──────────────────────────────────────────
  const Table = ({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty: string }) => (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0c1321] text-[#d0c5af]">
          <tr>{headers.map(h => <th className="p-4" key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {React.Children.count(children) === 0 && <p className="p-12 text-center text-sm text-[#d0c5af]">{empty}</p>}
    </Card>
  );

  // ── sloka JSON modal ──────────────────────────────────────
  const SlokaModal = slokaModal && (
    <Modal
      title={slokaModal.mode === 'view' ? `View — ${slokaModal.record?.verse_id}` : slokaModal.mode === 'edit' ? `Edit — ${slokaModal.record?.verse_id}` : 'Add Sloka'}
      onClose={() => setSlokaModal(null)}
      wide
    >
      <div className="p-5 space-y-4">
        {slokaLoading ? <Spinner /> : slokaModal.mode === 'view' ? (
          <textarea className={`${ipt} min-h-96 font-mono`} value={slokaRaw} readOnly />
        ) : (
          <>
            <p className="text-xs text-[#d0c5af]/70">
              Paste complete single-sloka JSON. ID must match&nbsp;
              <span className="text-[#f2ca50] font-mono">
                {scripture?.name.split(' ').map(w => w[0]).join('').toUpperCase()}.{chapter?.chapter_number}.N
              </span>
            </p>
            <textarea
              className={`${ipt} min-h-80 font-mono`}
              value={slokaRaw}
              onChange={e => { setSlokaRaw(e.target.value); setSlokaValid(null); setSlokaErr(''); }}
              placeholder={`{\n  "id": "BG.${chapter?.chapter_number}.1",\n  "verse_number": 1,\n  "sanskrit": { "devanagari": "...", "transliteration": "..." },\n  "languages": { "en": { "translation": "", "meaning": "", "explanation": "", "example": "" }, ... }\n}`}
            />
            {slokaErr && (
              <p className="text-xs text-rose-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>{slokaErr}
              </p>
            )}
            {slokaValid && (
              <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
                Valid — <b>{slokaValid.id}</b> · {Object.keys(slokaValid.languages).join(', ').toUpperCase()}
              </div>
            )}
            <div className="flex gap-3">
              <Btn className="bg-[#232a39] text-[#dce2f6] border border-white/10" onClick={handleValidate}>Validate JSON</Btn>
              <Btn className="bg-[#f2ca50] text-[#3c2f00] disabled:opacity-50" onClick={handleSaveSloka} disabled={saving || !slokaRaw.trim()}>
                {saving ? 'Saving…' : 'Save Sloka'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );

  // ── scripture edit modal ──────────────────────────────────
  const ScriptureModal = scriptureEdit && (
    <Modal title={scriptureEdit.id ? 'Edit Scripture' : 'Add Scripture'} onClose={() => { setScriptureEdit(null); setScriptureImageFile(null); }}>
      <form className="p-5 space-y-4" onSubmit={saveScripture}>
        <Field label="Name *"><input className={ipt} required value={scriptureEdit.name || ''} onChange={e => setScriptureEdit({ ...scriptureEdit, name: e.target.value })} /></Field>
        <Field label="Description"><textarea className={ipt} value={scriptureEdit.description || ''} onChange={e => setScriptureEdit({ ...scriptureEdit, description: e.target.value })} /></Field>
        <Field label="Cover Image">
          <div className="space-y-2">
            {scriptureEdit.cover_image_url && !scriptureImageFile && (
              <img src={scriptureEdit.cover_image_url} alt="Current cover" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
            )}
            <input className={ipt} type="file" accept="image/*" onChange={e => setScriptureImageFile(e.target.files?.[0] || null)} />
            {scriptureImageFile && <p className="text-[11px] text-[#d0c5af]/70">Selected: {scriptureImageFile.name}</p>}
          </div>
        </Field>
        <Field label="Status">
          <select className={ipt} value={scriptureEdit.status || 'Draft'} onChange={e => setScriptureEdit({ ...scriptureEdit, status: e.target.value as CmsStatus })}>
            <option>Draft</option><option>Published</option><option>Archived</option>
          </select>
        </Field>
        <Btn type="submit" className="bg-[#f2ca50] text-[#3c2f00] disabled:opacity-50" disabled={saving}>{saving ? 'Saving…' : 'Save Scripture'}</Btn>
      </form>
    </Modal>
  );

  // ── chapter edit modal ────────────────────────────────────
  const ChapterModal = chapterEdit && (
    <Modal title={chapterEdit.id ? 'Edit Chapter' : 'Add Chapter'} onClose={() => setChapterEdit(null)}>
      <form className="p-5 space-y-4" onSubmit={saveChapter}>
        <Field label="Chapter Number *"><input className={ipt} type="number" min="1" required value={chapterEdit.chapter_number || ''} onChange={e => setChapterEdit({ ...chapterEdit, chapter_number: Number(e.target.value) })} /></Field>
        <Field label="Title *"><input className={ipt} required value={chapterEdit.title || ''} onChange={e => setChapterEdit({ ...chapterEdit, title: e.target.value })} /></Field>
        <Field label="Subtitle"><input className={ipt} value={chapterEdit.subtitle || ''} onChange={e => setChapterEdit({ ...chapterEdit, subtitle: e.target.value })} /></Field>
        <Field label="Description"><textarea className={ipt} value={chapterEdit.description || ''} onChange={e => setChapterEdit({ ...chapterEdit, description: e.target.value })} /></Field>
        <Field label="Chapter Image">
          <div className="space-y-2">
            {chapterEdit.image_url && !chapterImageFile && <img src={chapterEdit.image_url} alt="Current chapter" className="w-20 h-20 rounded-lg object-cover border border-white/10" />}
            <input className={ipt} type="file" accept="image/*" onChange={e => setChapterImageFile(e.target.files?.[0] || null)} />
            {chapterImageFile && <p className="text-[11px] text-[#d0c5af]/70">Selected: {chapterImageFile.name}</p>}
          </div>
        </Field>
        <Field label="Status">
          <select className={ipt} value={chapterEdit.status || 'Draft'} onChange={e => setChapterEdit({ ...chapterEdit, status: e.target.value as CmsStatus })}>
            <option>Draft</option><option>Published</option><option>Archived</option>
          </select>
        </Field>
        <Btn type="submit" className="bg-[#f2ca50] text-[#3c2f00] disabled:opacity-50" disabled={saving}>{saving ? 'Saving…' : 'Save Chapter'}</Btn>
      </form>
    </Modal>
  );

  const DeleteModal = (
    <ConfirmModal
      isOpen={!!removing}
      title={`Delete ${removing?.type || ''}?`}
      message={`Permanently delete "${removing?.label}"? This cannot be undone.`}
      confirmText="Delete"
      onCancel={() => setRemoving(null)}
      onConfirm={confirmDelete}
    />
  );

  // ── CHAPTER VIEW ──────────────────────────────────────────
  if (chapter && scripture) return (
    <div className="p-4 md:p-10 space-y-5 pb-28">
      <button onClick={() => { setChapter(null); clearFilters(); }} className="text-xs text-[#f2ca50]">
        ← Back to {scripture.name}
      </button>
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#d0c5af]/70">Content / {scripture.name} / Chapter {chapter.chapter_number}</p>
          <h2 className="font-serif-headline text-3xl font-bold">Chapter {chapter.chapter_number}: {chapter.title}</h2>
          {chapter.subtitle && <p className="text-sm text-[#d0c5af]/70 mt-1">{chapter.subtitle}</p>}
        </div>
        <Btn className="bg-[#f2ca50] text-[#3c2f00]" onClick={openAddSloka}>+ Add Sloka</Btn>
      </div>

      {notice && <div className="p-3 text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">{notice}</div>}

      <Card className="p-5 flex flex-col sm:flex-row gap-6">
        {chapter.image_url && (
          <img src={chapter.image_url} alt={chapter.title} className="w-32 h-32 rounded-xl object-cover shrink-0 border border-white/10" />
        )}
        <div className="flex-1 space-y-2">
          <p className="text-xs text-[#d0c5af]/70">Description</p>
          <p className="text-sm text-[#dce2f6]">{chapter.description || <span className="italic opacity-40">No description</span>}</p>
        </div>
        <div className="flex gap-6 shrink-0 items-start">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#f2ca50]">{chapter.sloka_count}</p>
            <p className="text-xs text-[#d0c5af]/70 mt-0.5">Slokas</p>
          </div>
          <div className="text-center">
            <Badge value={chapter.status} />
            <p className="text-xs text-[#d0c5af]/70 mt-1">Status</p>
          </div>
        </div>
      </Card>

      <Toolbar placeholder="Search slokas…" />

      {loadingSlokas ? <Spinner /> : (
        <Table headers={['Verse', 'ID', 'Sanskrit Preview', 'Status', 'Actions']} empty='No slokas yet. Click "+ Add Sloka" to add one.'>
          {filteredSlokas.map(s => (
            <tr className="border-t border-white/5" key={s.id}>
              <td className="p-4 font-bold text-[#f2ca50]">#{s.verse_number}</td>
              <td className="p-4 font-mono text-xs">{s.verse_id}</td>
              <td className="p-4 text-[#d0c5af] max-w-xs truncate text-xs italic opacity-80">{slokaPreviews[s.id] || '—'}</td>
              <td className="p-4"><Badge value={s.status} /></td>
              <td className="p-4">
                <div className="flex gap-3">
                  <button className="text-[#d0c5af] hover:text-white text-xs" onClick={() => openViewSloka(s)}>View</button>
                  <button className="text-[#f2ca50] hover:text-white text-xs" onClick={() => openEditSloka(s)}>Edit</button>
                  <button className="text-rose-300 hover:text-rose-200 text-xs" onClick={() => setRemoving({ type: 'sloka', item: s, label: s.verse_id })}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {SlokaModal}
      {DeleteModal}
    </div>
  );

  // ── SCRIPTURE / CHAPTERS VIEW ─────────────────────────────
  if (scripture) return (
    <div className="p-4 md:p-10 space-y-5 pb-28">
      <button className="text-xs text-[#f2ca50]" onClick={() => { setScripture(null); clearFilters(); }}>← Back to Content</button>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-xs text-[#d0c5af]/70">Content / {scripture.name}</p>
          <h2 className="font-serif-headline text-3xl font-bold">{scripture.name}</h2>
        </div>
        <Btn className="bg-[#f2ca50] text-[#3c2f00]" onClick={() => { setChapterImageFile(null); setChapterEdit({ chapter_number: (chapters.at(-1)?.chapter_number || 0) + 1, status: 'Draft' }); }}>+ Add Chapter</Btn>
      </div>

      {notice && <div className="p-3 text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">{notice}</div>}
      <Toolbar placeholder="Search chapters…" />

      {loadingChapters ? <Spinner /> : (
        <Table headers={['#', 'Chapter', 'Slokas', 'Status', 'Updated', 'Actions']} empty="No chapters yet. Add your first chapter.">
          {filteredChapters.map(c => (
            <tr className="border-t border-white/5" key={c.id}>
              <td className="p-4">{c.chapter_number}</td>
              <td className="p-4 font-semibold hover:text-[#f2ca50] cursor-pointer" onClick={() => { setChapter(c); clearFilters(); }}>{c.title}</td>
              <td className="p-4">{c.sloka_count}</td>
              <td className="p-4"><Badge value={c.status} /></td>
              <td className="p-4">{new Date(c.updated_at).toLocaleDateString()}</td>
              <td className="p-4 space-x-3">
                <button className="text-[#f2ca50] text-xs" onClick={() => { setChapter(c); clearFilters(); }}>Open</button>
                <button className="text-xs" onClick={() => { setChapterImageFile(null); setChapterEdit(c); }}>Edit</button>
                <button className="text-rose-300 text-xs" onClick={() => setRemoving({ type: 'chapter', item: c, label: `Chapter ${c.chapter_number}` })}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {ChapterModal}
      {DeleteModal}
    </div>
  );

  // ── ROOT / SCRIPTURES VIEW ────────────────────────────────
  return (
    <div className="p-4 md:p-10 space-y-5 pb-28">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl font-bold">Content</h2>
          <p className="text-sm text-[#d0c5af]/75 mt-1">Manage scriptures, chapters, and slokas.</p>
        </div>
        <Btn className="bg-[#f2ca50] text-[#3c2f00]" onClick={() => setScriptureEdit({ status: 'Draft' })}>+ Add Scripture</Btn>
      </div>

      {notice && <div className="p-3 text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">{notice}</div>}
      <Toolbar placeholder="Search scriptures…" />

      {loadingScriptures ? <Spinner /> : (
        <Table headers={['', 'Scripture', 'Description', 'Status', 'Updated', 'Actions']} empty="No scriptures found.">
          {filteredScriptures.map(s => (
            <tr className="border-t border-white/5" key={s.id}>
              <td className="p-4">
                {s.cover_image_url
                  ? <img src={s.cover_image_url} alt={s.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                  : <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><span className="material-symbols-outlined text-sm text-[#d0c5af]/40">menu_book</span></div>}
              </td>
              <td className="p-4 font-semibold cursor-pointer hover:text-[#f2ca50]" onClick={() => { setScripture(s); clearFilters(); }}>{s.name}</td>
              <td className="p-4 text-[#d0c5af] max-w-xs truncate text-xs">{s.description || '—'}</td>
              <td className="p-4"><Badge value={s.status} /></td>
              <td className="p-4">{new Date(s.updated_at).toLocaleDateString()}</td>
              <td className="p-4 space-x-3">
                <button className="text-[#f2ca50] text-xs" onClick={() => { setScripture(s); clearFilters(); }}>Open</button>
                <button className="text-xs" onClick={() => setScriptureEdit(s)}>Edit</button>
                <button className="text-rose-300 text-xs" onClick={() => setRemoving({ type: 'scripture', item: s, label: s.name })}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {ScriptureModal}
      {DeleteModal}
    </div>
  );
};

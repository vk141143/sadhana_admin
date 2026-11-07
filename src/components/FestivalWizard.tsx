import { validateFestival, type FestivalIssue } from '../services/festivalValidation';
import React, { useState, useRef, useEffect } from 'react';
import { FestivalFull, FestivalOccurrence, FestivalContent, FestivalMedia, FestivalSettings } from '../types';
import {
  saveFestivalWizard, fetchFestivalFull,
} from '../services/festivalService';
import { Step1BasicInfo }       from './Step1BasicInfo';
import { Step2DatePanchanga }   from './Step2DatePanchanga';
import { Step7Timings }         from './Step7Timings';
import { StepFasting }          from './StepFasting';
import { Step4Content }         from './Step4Content';
import { StepPuja }             from './StepPuja';
import { StepRelatedContent }   from './StepRelatedContent';
import { StepMedia }            from './StepMedia';
import { Step10HomeSettings }   from './Step10HomeSettings';
import { Step11Review }         from './Step11Review';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingFestival?: FestivalFull | null;
}

const STEPS = [
  { id: 1, title: 'Festival Details' },
  { id: 2, title: 'Panchanga' },
  { id: 3, title: 'Timings' },
  { id: 4, title: 'Fasting' },
  { id: 5, title: 'Content' },
  { id: 6, title: 'Puja' },
  { id: 7, title: 'Related Content' },
  { id: 8, title: 'Media' },
  { id: 9, title: 'Review & Publish' },
];

const emptyOccurrence = (): Partial<FestivalOccurrence> => ({
  year: new Date().getFullYear(),
  festival_date: '',
  tithi_name: '', paksha: '',
  nakshatra_name: '',
  yoga_name: '',
  shubha_muhurta_start: null, shubha_muhurta_end: null,
  puja_time_start: null, puja_time_end: null,
  rahu_kalam_start: null, rahu_kalam_end: null,
  yamagandam_start: null, yamagandam_end: null,
  gulika_kalam_start: null, gulika_kalam_end: null,
  fasting_enabled: false, fasting_type: '',
  parana_required: false, parana_time: null,
  fasting_rules: '',
  custom_timings: [],
  status: 'draft',
});

const emptyContent = (): Partial<FestivalContent> => ({
  festival_description: '', spiritual_significance: '',
  festival_story: [], scriptural_references: [],
  puja_name: '', puja_description: '',
  puja_samagri: [], puja_vidhi: [],
  story_r2_key: '', story_r2_url: '',
  puja_r2_key: '', puja_r2_url: '',
  related_scriptures: [], related_slokas: [], related_mantras: [],
  related_stotrams: [], related_music: [], related_stories: [],
});

const emptySettings = (): Partial<FestivalSettings> => ({
  show_on_home: false, is_featured: false, priority: 0, show_in_calendar: true,
  show_from: null, show_until: null,
});

export const FestivalWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess, editingFestival }) => {
  const [step, setStep]       = useState<number>(Math.max(1, Math.min(9, (editingFestival as any)?.wizard_state?.step || 1)));
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [issues, setIssues] = useState<FestivalIssue[]>([]);
  const [error, setError]     = useState<string | null>(null);

  const [festivalId, setFestivalId]     = useState<string | null>(editingFestival?.id ?? null);

  const [formData, setFormData] = useState<any>(editingFestival ?? {
    name: '', alternate_name: '', slug: '', festival_type: 'Major Festival',
    primary_deity: '', tradition: 'general', short_description: '',
    is_active: true, status: 'Draft',
  });
  const [occurrence, setOccurrence] = useState<Partial<FestivalOccurrence>>(
    editingFestival?.occurrence ?? emptyOccurrence()
  );
  const [content, setContent] = useState<Partial<FestivalContent>>(
    editingFestival?.content ?? emptyContent()
  );
  const [media, setMedia]       = useState<FestivalMedia[]>(editingFestival?.media ?? []);
  const [settings, setSettings] = useState<Partial<FestivalSettings>>(
    editingFestival?.settings ?? emptySettings()
  );
  const [bannerUrl, setBannerUrl] = useState<string>(editingFestival?.banner_url ?? '');

  const snapshot = JSON.stringify({ formData, occurrence, content, settings });
  const savedSnapshot = useRef(snapshot);
  const dirty = savedSnapshot.current !== snapshot;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty || uploading) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);
  const close = () => {
    if (loading || uploading) return;
    if (dirty && !window.confirm('Discard unsaved festival changes? Uploaded files are retained.')) return;
    onClose();
  };
  const navigate = async (next: number) => {
    if (loading || uploading) return;
    const found = validateFestival({ festival: formData, occurrence, content, settings }, true);
    const relevant = next > step ? found.filter(i => i.step === step) : [];
    setIssues(relevant);
    if (relevant.length) { setError('Please correct the highlighted fields.'); return; }
    if (next > step && validateFestival({ festival: formData, occurrence, content, settings }).length) {
      setStep(next); setError(null);
      setNotice('Values retained. Correct invalid fields in the other steps before saving.');
      return;
    }
    if (next > step && !(await save(formData.status || 'Draft', next))) return;
    setStep(next); setError(null);
  };
  const save = async (status: 'Draft' | 'Published' | 'Archived', resumeStep = step) => {
    if (savingRef.current || uploading) return;
    const found = validateFestival({ festival: formData, occurrence, content, settings }, status === 'Published');
    setIssues(found);
    if (found.length) { setStep(found[0].step); setError('Please correct the highlighted fields.'); return; }
    savingRef.current = true;
    setLoading(true); setError(null); setNotice('');
    try {
      const id = await saveFestivalWizard(festivalId, { festival: formData, occurrence, content, settings }, status, resumeStep, setFestivalId);
      setFestivalId(id);
      setFormData((previous: any) => ({ ...previous, status }));
      savedSnapshot.current = JSON.stringify({ formData: { ...formData, status }, occurrence, content, settings });
      setNotice(status === 'Published' ? 'Festival published.' : status === 'Archived' ? 'Festival archived.' : 'Draft saved.');
      onSuccess();
      // Refresh generated child IDs without replacing locally entered fields.
      try {
        const saved = await fetchFestivalFull(id);
        const nextOccurrence = saved.occurrence?.id ? { ...occurrence, id: saved.occurrence.id } : occurrence;
        const nextContent = saved.content?.id ? { ...content, id: saved.content.id, occurrence_id: saved.content.occurrence_id } : content;
        setOccurrence(nextOccurrence);
        setContent(nextContent);
        savedSnapshot.current = JSON.stringify({ formData: { ...formData, status }, occurrence: nextOccurrence, content: nextContent, settings });
      } catch { setNotice('Saved. Could not refresh generated IDs; reopen the draft when the connection recovers.'); }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Festival could not be saved. Your changes are still here.');
    } finally { savingRef.current = false; setLoading(false); }
  };
  const handleSaveDraft = () => save('Draft');
  const handlePublish = () => save('Published');
  const handleMedia = (items: FestivalMedia[]) => {
    setMedia(items);
    const cover = items.find(item => item.is_cover);
    setBannerUrl(cover?.public_url || '');
    setFormData((previous: any) => ({ ...previous, cover_media_id: cover?.id ?? null }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#19202e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-[#0c1321] border-b border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif-headline text-xl font-bold text-[#f2ca50]">
              {editingFestival ? 'Edit Festival' : 'Add New Festival'}
            </h2>
            <button onClick={close} disabled={loading || uploading} className="p-2 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/10">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => navigate(s.id)} disabled={loading || uploading}
                  title={s.title}
                  className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    step === s.id ? 'bg-[#f2ca50] text-[#3c2f00]'
                    : !validateFestival({ festival: formData, occurrence, content, settings }, true).some(i => i.step === s.id) ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-white/10 text-[#d0c5af]'
                  }`}
                >
                  {!validateFestival({ festival: formData, occurrence, content, settings }, true).some(i => i.step === s.id) ? <span className="material-symbols-outlined text-xs">check</span> : s.id}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full min-w-[4px] transition-all ${!validateFestival({ festival: formData, occurrence, content, settings }, true).some(i => i.step === s.id) ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-[#d0c5af]/60 mt-2">Step {step} of {STEPS.length}: {STEPS[step - 1].title}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{error}</div>
          )}

          {notice && <p role="status" className="mb-3 text-emerald-300 text-sm">{notice}</p>}
          {issues.filter(i => i.step === step).map(i => <p key={i.field} role="alert" className="mb-2 text-rose-300 text-xs">{i.field.replaceAll('_', ' ')}: {i.message}</p>)}
          <fieldset disabled={loading || uploading} className={`min-w-0 ${loading || uploading ? 'pointer-events-none' : ''}`}>
          {step === 1 && (
            <Step1BasicInfo
              festivalId={festivalId}
              formData={formData}
              setFormData={setFormData}
              bannerUrl={bannerUrl}
              setBannerUrl={setBannerUrl}
              onUploading={setUploading}
              onCover={item => handleMedia([...media.filter(m => m.id !== item.id).map(m => ({ ...m, is_cover: false })), item])}
            />
          )}
          {step === 2 && (
            <Step2DatePanchanga
              occurrence={occurrence}
              setOccurrence={setOccurrence}
            />
          )}
          {step === 3 && (
            <Step7Timings
              occurrence={occurrence}
              setOccurrence={setOccurrence}
            />
          )}
          {step === 4 && (
            <StepFasting
              occurrence={occurrence}
              setOccurrence={setOccurrence}
            />
          )}
          {step === 5 && (
            <Step4Content
              festivalId={festivalId}
              festivalSlug={formData.slug || undefined}
              festivalYear={occurrence.year}
              content={content}
              setContent={setContent}
              media={media}
              setMedia={handleMedia}
              onUploading={setUploading}
            />
          )}
          {step === 6 && (
            <StepPuja
              content={content}
              setContent={setContent}
            />
          )}
          {step === 7 && (
            <StepRelatedContent
              content={content}
              setContent={setContent}
            />
          )}
          {step === 8 && (
            <div className="space-y-6">
              <StepMedia
                festivalId={festivalId}
                festivalSlug={formData.slug || undefined}
                festivalYear={occurrence.year}
                media={media}
                setMedia={handleMedia}
              onUploading={setUploading}
              />
              <Step10HomeSettings
                settings={settings as FestivalSettings | null}
                setSettings={s => setSettings(s ?? emptySettings())}
              />
            </div>
          )}
          {step === 9 && (
            <Step11Review
              formData={formData}
              occurrence={occurrence}
              content={content}
              media={media}
              settings={settings}
              bannerUrl={bannerUrl}
            />
          )}
          </fieldset>
        </div>

        {/* Footer */}
        <div className="bg-[#0c1321] border-t border-white/10 p-5 flex items-center justify-between gap-3">
          <span className="text-xs text-[#d0c5af]/50">{step} / {STEPS.length}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(step - 1)}
              disabled={step === 1 || loading || uploading}
              className="px-4 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-white/10 transition-colors"
            >Back</button>

            <button
              onClick={handleSaveDraft}
              disabled={loading || uploading}
              className="px-4 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-white/10 transition-colors"
            >{loading ? 'Saving…' : 'Save Draft'}</button>

            {formData.status === 'Archived' && <button disabled={loading || uploading} onClick={() => save('Archived')} className="text-sm text-amber-300">Save as archived</button>}
            {step < STEPS.length ? (
              <button
                onClick={() => navigate(step + 1)}
                disabled={loading || uploading}
                className="px-4 py-2 bg-[#f2ca50] text-[#3c2f00] rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#ffe082] transition-colors"
              >Next</button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={loading || uploading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-emerald-500 transition-colors flex items-center gap-2"
              >
                {loading
                  ? <><span className="animate-spin material-symbols-outlined text-sm">hourglass_empty</span>Publishing…</>
                  : <><span className="material-symbols-outlined text-sm">check_circle</span>Publish Festival</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

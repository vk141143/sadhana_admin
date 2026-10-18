import React, { useState, useCallback } from 'react';
import { FestivalFull, FestivalOccurrence, FestivalContent, FestivalMedia, FestivalSettings } from '../types';
import {
  createFestival, updateFestival,
  upsertOccurrence, upsertContent, upsertFestivalSettings,
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
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [festivalId, setFestivalId]     = useState<string | null>(editingFestival?.id ?? null);
  const [occurrenceId, setOccurrenceId] = useState<string | null>(editingFestival?.occurrence?.id ?? null);

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

  const saveDraftCore = useCallback(async (): Promise<string> => {
    const payload = { ...formData, status: formData.status || 'Draft' };
    let id = festivalId;
    if (!id) {
      id = await createFestival(payload);
      setFestivalId(id);
    } else {
      await updateFestival(id, payload);
    }
    return id;
  }, [festivalId, formData]);

  const handleSaveDraft = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const id = await saveDraftCore();
      if (occurrence.festival_date) {
        const saved = await upsertOccurrence(id, occurrence);
        setOccurrenceId(saved.id);
      }
      await upsertContent(id, content, occurrenceId);
      await upsertFestivalSettings(id, settings as any);
      alert('Festival saved as draft!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally { setLoading(false); }
  }, [saveDraftCore, occurrence, content, occurrenceId, settings]);

  const handlePublish = useCallback(async () => {
    if (!formData.name?.trim()) { setError('Festival name is required.'); return; }
    if (!occurrence.festival_date) { setError('Festival date is required.'); return; }
    try {
      setLoading(true); setError(null);
      const id = await saveDraftCore();
      await updateFestival(id, { status: 'Published' });
      const saved = await upsertOccurrence(id, { ...occurrence, status: 'published' });
      setOccurrenceId(saved.id);
      await upsertContent(id, content, saved.id);
      await upsertFestivalSettings(id, settings as any);
      alert('Festival published!');
      onSuccess(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally { setLoading(false); }
  }, [formData, occurrence, content, settings, saveDraftCore, onSuccess, onClose]);

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
            <button onClick={onClose} className="p-2 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/10">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => { setStep(s.id); setError(null); }}
                  title={s.title}
                  className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    step === s.id ? 'bg-[#f2ca50] text-[#3c2f00]'
                    : step > s.id ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-white/10 text-[#d0c5af]'
                  }`}
                >
                  {step > s.id ? <span className="material-symbols-outlined text-xs">check</span> : s.id}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full min-w-[4px] transition-all ${step > s.id ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
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

          {step === 1 && (
            <Step1BasicInfo
              festivalId={festivalId}
              formData={formData}
              setFormData={setFormData}
              bannerUrl={bannerUrl}
              setBannerUrl={setBannerUrl}
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
              setMedia={setMedia}
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
                setMedia={setMedia}
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
        </div>

        {/* Footer */}
        <div className="bg-[#0c1321] border-t border-white/10 p-5 flex items-center justify-between gap-3">
          <span className="text-xs text-[#d0c5af]/50">{step} / {STEPS.length}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (step > 1) { setStep(s => s - 1); setError(null); } }}
              disabled={step === 1 || loading}
              className="px-4 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-white/10 transition-colors"
            >Back</button>

            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="px-4 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-white/10 transition-colors"
            >{loading ? 'Saving…' : 'Save Draft'}</button>

            {step < STEPS.length ? (
              <button
                onClick={() => { setStep(s => s + 1); setError(null); }}
                disabled={loading}
                className="px-4 py-2 bg-[#f2ca50] text-[#3c2f00] rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#ffe082] transition-colors"
              >Next</button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={loading}
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

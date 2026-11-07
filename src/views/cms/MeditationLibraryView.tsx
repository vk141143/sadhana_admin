import React, { useEffect, useState } from 'react';
import {
  meditationLibraryService,
  type MeditationAnalytics,
  type MeditationAudioAsset,
  type MeditationCategory,
  type MeditationLanguage,
  type MeditationPhase,
  type MeditationPractice,
  type MeditationRecommendation,
  type MeditationSessionActivity,
  type MeditationStage,
  type MeditationStageAssignment,
  type MeditationTranslation,
} from '../../services/meditationLibraryService';
import { sadhanaMediaService } from '../../services/sadhanaMediaService';

type Section = 'practices' | 'categories' | 'stages' | 'recommendations' | 'tracking';
type PracticeDraft = Partial<MeditationPractice>;
type CategoryDraft = Partial<MeditationCategory>;
type StageDraft = Partial<MeditationStage>;

const LANGUAGES: MeditationLanguage[] = ['en', 'te', 'hi', 'kn', 'ta', 'ml'];
const DURATION_PRESETS = [180, 300, 600, 900, 1200, 1800];
const PHASE_TYPES = ['preparation', 'breathing', 'meditation', 'mantra', 'silence', 'closing', 'other'];
const inputClass = 'w-full rounded-lg border border-white/10 bg-[#0c1321] px-3 py-2 text-sm text-[#dce2f6] outline-none focus:border-[#f2ca50]/60';
const labelClass = 'mb-1 block text-xs font-semibold text-[#f2ca50]';

function slugify(value: string): string {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultPractice(): PracticeDraft {
  return {
    name: '',
    slug: '',
    subtitle: '',
    description: '',
    instructions: '',
    meditation_type: 'guided',
    difficulty: 'beginner',
    default_duration_seconds: 600,
    available_durations_seconds: DURATION_PRESETS,
    requires_audio: false,
    has_ambient_audio: true,
    has_bell: true,
    allow_silent_mode: true,
    benefits: [],
    tags: [],
    is_featured: false,
    is_active: false,
    display_order: 0,
  };
}

export const MeditationLibraryView: React.FC = () => {
  const [section, setSection] = useState<Section>('practices');
  const [practices, setPractices] = useState<MeditationPractice[]>([]);
  const [categories, setCategories] = useState<MeditationCategory[]>([]);
  const [stages, setStages] = useState<MeditationStage[]>([]);
  const [assignments, setAssignments] = useState<MeditationStageAssignment[]>([]);
  const [recommendations, setRecommendations] = useState<MeditationRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<MeditationAnalytics | null>(null);
  const [sessions, setSessions] = useState<MeditationSessionActivity[]>([]);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PracticeDraft>(defaultPractice());
  const [durationText, setDurationText] = useState(DURATION_PRESETS.join(', '));
  const [translations, setTranslations] = useState<MeditationTranslation[]>([]);
  const [phases, setPhases] = useState<MeditationPhase[]>([]);
  const [audioAssets, setAudioAssets] = useState<MeditationAudioAsset[]>([]);
  const [translationDraft, setTranslationDraft] = useState<Partial<MeditationTranslation> | null>(null);
  const [phaseDraft, setPhaseDraft] = useState<Partial<MeditationPhase> | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [stageDraft, setStageDraft] = useState<StageDraft | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState({ stage_id: '', practice_id: '' });
  const [recommendationDraft, setRecommendationDraft] = useState<Partial<MeditationRecommendation>>({
    practice_id: '',
    recommendation_date: new Date().toISOString().slice(0, 10),
    title: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [practiceRows, categoryRows, stageRows, assignmentRows, recommendationRows, stats, recent] =
        await Promise.all([
          meditationLibraryService.listPractices(),
          meditationLibraryService.listCategories(),
          meditationLibraryService.listStages(),
          meditationLibraryService.listStageAssignments(),
          meditationLibraryService.listRecommendations(),
          meditationLibraryService.getAnalytics(analyticsDays),
          meditationLibraryService.listRecentSessions(analyticsDays),
        ]);
      setPractices(practiceRows);
      setCategories(categoryRows);
      setStages(stageRows);
      setAssignments(assignmentRows);
      setRecommendations(recommendationRows);
      setAnalytics(stats);
      setSessions(recent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meditation Library could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [analyticsDays]);

  const setPracticeField = <K extends keyof PracticeDraft>(key: K, value: PracticeDraft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  const openCreate = () => {
    setDraft(defaultPractice());
    setDurationText(DURATION_PRESETS.join(', '));
    setTranslations([]);
    setPhases([]);
    setAudioAssets([]);
    setTranslationDraft(null);
    setPhaseDraft(null);
    setEditorOpen(true);
    setError('');
  };

  const openEdit = async (practice: MeditationPractice) => {
    setError('');
    try {
      const [translationRows, phaseRows, audioRows] = await Promise.all([
        meditationLibraryService.listTranslations(practice.id),
        meditationLibraryService.listPhases(practice.id),
        meditationLibraryService.listAudioAssets(practice.id),
      ]);
      setDraft({ ...practice });
      setDurationText(practice.available_durations_seconds.join(', '));
      setTranslations(translationRows);
      setPhases(phaseRows);
      setAudioAssets(audioRows);
      setTranslationDraft(null);
      setPhaseDraft(null);
      setEditorOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meditation details could not be loaded.');
    }
  };

  const savePractice = async (event: React.FormEvent) => {
    event.preventDefault();
    const durations = durationText.split(',').map(value => Number(value.trim()));
    if (!durations.length || durations.some(value => !Number.isInteger(value) || value <= 0)) {
      setError('Enter one or more valid positive durations in seconds.');
      return;
    }
    if (!draft.name?.trim() || !draft.slug?.trim()) {
      setError('A name and slug are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await meditationLibraryService.savePractice({
        ...draft,
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        available_durations_seconds: [...new Set(durations)],
      });
      setDraft(saved);
      setDurationText(saved.available_durations_seconds.join(', '));
      setPractices(current => current.some(item => item.id === saved.id)
        ? current.map(item => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setNotice('Meditation practice saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meditation practice could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveTranslation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.id || !translationDraft?.language_code) return;
    setSaving(true);
    setError('');
    try {
      const saved = await meditationLibraryService.saveTranslation({
        ...translationDraft,
        practice_id: draft.id,
        language_code: translationDraft.language_code,
      });
      setTranslations(current => [...current.filter(item => item.language_code !== saved.language_code), saved]);
      setTranslationDraft(null);
      setNotice('Translation saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Translation could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const savePhase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.id || !phaseDraft?.phase_name?.trim()) return;
    setSaving(true);
    setError('');
    try {
      const saved = await meditationLibraryService.savePhase({
        ...phaseDraft,
        practice_id: draft.id,
        phase_name: phaseDraft.phase_name.trim(),
        phase_type: phaseDraft.phase_type ?? 'meditation',
        duration_seconds: phaseDraft.duration_seconds ?? 60,
        display_order: phaseDraft.display_order ?? phases.length,
      });
      setPhases(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((left, right) => left.display_order - right.display_order));
      setPhaseDraft(null);
      setNotice('Session phase saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Session phase could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAudio = async (file: File) => {
    if (!draft.id) {
      setError('Save the meditation practice before adding audio.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded = await sadhanaMediaService.upload(file, 'audio', () => undefined);
      const asset = await meditationLibraryService.saveAudioAsset({
        practice_id: draft.id,
        language_code: 'en',
        audio_type: 'guided',
        title: file.name,
        storage_provider: 'cloudflare_r2',
        storage_key: uploaded.object_key,
        public_url: uploaded.media_url,
        duration_seconds: null,
        file_size_bytes: file.size,
        mime_type: file.type,
        is_default: audioAssets.length === 0,
        display_order: audioAssets.length,
        is_active: false,
      });
      setAudioAssets(current => [...current, asset]);
      setNotice('Audio uploaded to Cloudflare R2 and saved as inactive until reviewed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const uploaded = await sadhanaMediaService.upload(file, 'image', () => undefined);
      setPracticeField('cover_image_url', uploaded.media_url);
      setNotice('Cover image uploaded to Cloudflare R2.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cover image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryDraft?.name?.trim()) return;
    setSaving(true);
    setError('');
    try {
      const saved = await meditationLibraryService.saveCategory({
        ...categoryDraft,
        name: categoryDraft.name.trim(),
        slug: categoryDraft.slug?.trim() || slugify(categoryDraft.name),
        description: categoryDraft.description ?? '',
        display_order: categoryDraft.display_order ?? categories.length,
      });
      setCategories(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((left, right) => left.display_order - right.display_order));
      setCategoryDraft(null);
      setNotice('Meditation category saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meditation category could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveStage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stageDraft?.name?.trim() || !stageDraft.category_id) return;
    setSaving(true);
    setError('');
    try {
      const saved = await meditationLibraryService.saveStage({
        ...stageDraft,
        category_id: stageDraft.category_id,
        name: stageDraft.name.trim(),
        slug: stageDraft.slug?.trim() || slugify(stageDraft.name),
        stage_number: stageDraft.stage_number ?? stages.length + 1,
        difficulty: stageDraft.difficulty ?? 'beginner',
        estimated_duration_minutes: stageDraft.estimated_duration_minutes ?? 5,
        display_order: stageDraft.display_order ?? stages.length,
      });
      setStages(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((left, right) => left.stage_number - right.stage_number));
      setStageDraft(null);
      setNotice('Meditation stage saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meditation stage could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentDraft.stage_id || !assignmentDraft.practice_id) return;
    setSaving(true);
    setError('');
    try {
      const existing = assignments.find(item =>
        item.stage_id === assignmentDraft.stage_id && item.practice_id === assignmentDraft.practice_id);
      const saved = await meditationLibraryService.assignPractice(
        assignmentDraft.stage_id,
        assignmentDraft.practice_id,
        existing?.sequence_number ?? assignments.filter(item => item.stage_id === assignmentDraft.stage_id).length + 1,
        existing?.is_required ?? true,
      );
      setAssignments(current => [...current.filter(item => item.id !== saved.id), saved]);
      setNotice('Practice assigned to the selected journey stage.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Stage assignment could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveRecommendation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recommendationDraft.practice_id || !recommendationDraft.recommendation_date) return;
    setSaving(true);
    setError('');
    try {
      await meditationLibraryService.saveRecommendation({
        ...recommendationDraft,
        practice_id: recommendationDraft.practice_id,
        recommendation_date: recommendationDraft.recommendation_date,
      });
      setRecommendations(await meditationLibraryService.listRecommendations());
      setNotice('Daily recommendation saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Daily recommendation could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const changePracticeActive = async (practice: MeditationPractice) => {
    setError('');
    try {
      const saved = await meditationLibraryService.setPracticeActive(practice.id, !practice.is_active);
      setPractices(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Practice status could not be updated.');
    }
  };

  const changeAudioActive = async (asset: MeditationAudioAsset) => {
    setError('');
    try {
      const saved = await meditationLibraryService.setAudioActive(asset.id, !asset.is_active);
      setAudioAssets(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio status could not be updated.');
    }
  };

  const deleteRecord = async (
    resource: 'translations' | 'phases' | 'assignments' | 'recommendations',
    id: string,
    removeFromState: () => void,
  ) => {
    if (!window.confirm('Delete this record? This action cannot be undone.')) return;
    setError('');
    try {
      if (resource === 'translations') await meditationLibraryService.deleteTranslation(id);
      if (resource === 'phases') await meditationLibraryService.deletePhase(id);
      if (resource === 'assignments') await meditationLibraryService.deleteAssignment(id);
      if (resource === 'recommendations') await meditationLibraryService.deleteRecommendation(id);
      removeFromState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Record could not be deleted.');
    }
  };

  return (
    <div className="space-y-6 p-4 pb-28 md:p-8">
      <header>
        <h1 className="font-serif-headline text-2xl font-bold text-[#f2ca50]">Meditation Library</h1>
        <p className="mt-1 text-sm text-[#d0c5af]/70">
          Manage practices, translations, audio, journeys, recommendations and customer sessions.
        </p>
      </header>

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
        <span>{error}</span>
        {!editorOpen && <button onClick={() => void load()} className="shrink-0 underline">Retry</button>}
      </div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</div>}

      <nav className="flex flex-wrap gap-2" aria-label="Meditation management sections">
        {(['practices', 'categories', 'stages', 'recommendations', 'tracking'] as Section[]).map(item => (
          <button key={item} onClick={() => setSection(item)}
            className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${section === item ? 'bg-[#f2ca50] text-[#3c2f00]' : 'border border-white/10 bg-[#19202e] text-[#d0c5af]'}`}>
            {item === 'tracking' ? 'User tracking' : item}
          </button>
        ))}
      </nav>

      {loading ? <p role="status" className="py-12 text-center text-sm text-[#d0c5af]">Loading Meditation Library…</p> : (
        <>
          {section === 'practices' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#d0c5af]/70">{practices.length} meditation practices</p>
                <button onClick={openCreate} className="rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Add meditation</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {practices.map(practice => (
                  <article key={practice.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#19202e]">
                    {practice.cover_image_url && <img src={practice.cover_image_url} alt="" className="h-36 w-full object-cover" />}
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-semibold text-[#f2ca50]">{practice.name}</h2>
                          <p className="text-xs text-[#d0c5af]/70">
                            {practice.meditation_type.replace(/_/g, ' ')} · {practice.default_duration_seconds / 60} min
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] ${practice.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>
                          {practice.is_active ? 'Published' : 'Draft / inactive'}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-[#d0c5af]/70">{practice.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void openEdit(practice)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Manage</button>
                        <button onClick={() => void changePracticeActive(practice)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">
                          {practice.is_active ? 'Unpublish' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {practices.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-sm text-[#d0c5af]/70">No meditation practices have been created yet.</p>}
              </div>
            </section>
          )}

          {section === 'categories' && (
            <section className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setCategoryDraft({ is_active: false, display_order: categories.length })}
                  className="rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Add category</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {categories.map(category => (
                  <article key={category.id} className="rounded-xl border border-white/10 bg-[#19202e] p-4">
                    {category.cover_image_url && <img src={category.cover_image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}
                    <div className="flex items-center justify-between gap-3">
                      <div><h2 className="font-semibold text-[#f2ca50]">{category.name}</h2><p className="text-xs text-[#d0c5af]/60">{category.slug} · {category.is_active ? 'Active' : 'Inactive'}</p></div>
                      <button onClick={() => setCategoryDraft({ ...category })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Edit</button>
                    </div>
                    <p className="mt-2 text-xs text-[#d0c5af]/70">{category.description}</p>
                    <button onClick={async () => {
                      try {
                        const saved = await meditationLibraryService.setCategoryActive(category.id, !category.is_active);
                        setCategories(current => current.map(item => item.id === saved.id ? saved : item));
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'Category status could not be updated.');
                      }
                    }} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs">
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </article>
                ))}
                {categories.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-sm text-[#d0c5af]/70">No categories have been created.</p>}
              </div>
            </section>
          )}

          {section === 'stages' && (
            <section className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setStageDraft({
                  category_id: categories[0]?.id ?? '',
                  stage_number: stages.length + 1,
                  estimated_duration_minutes: 5,
                  difficulty: 'beginner',
                  is_active: false,
                  display_order: stages.length,
                })} disabled={categories.length === 0}
                  className="rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00] disabled:opacity-50">Add journey stage</button>
              </div>
              {categories.length === 0 && <p className="text-sm text-amber-200">Create a category before adding a stage.</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {stages.map(stage => (
                  <article key={stage.id} className="rounded-xl border border-white/10 bg-[#19202e] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-[#f2ca50]">Stage {stage.stage_number}: {stage.name}</h2>
                        <p className="text-xs text-[#d0c5af]/60">
                          {stage.estimated_duration_minutes ?? 0} min · {stage.is_active ? 'Active' : 'Inactive'} · {stage.difficulty}
                        </p>
                      </div>
                      <button onClick={() => setStageDraft({ ...stage })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Edit</button>
                    </div>
                    <p className="mt-2 text-xs text-[#d0c5af]/70">{stage.description}</p>
                    <p className="mt-2 text-xs text-[#d0c5af]/60">
                      Assigned: {assignments.filter(item => item.stage_id === stage.id)
                        .map(item => practices.find(practice => practice.id === item.practice_id)?.name)
                        .filter((name): name is string => Boolean(name)).join(', ') || 'None'}
                    </p>
                    <button onClick={async () => {
                      try {
                        const saved = await meditationLibraryService.setStageActive(stage.id, !stage.is_active);
                        setStages(current => current.map(item => item.id === saved.id ? saved : item));
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'Stage status could not be updated.');
                      }
                    }} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs">
                      {stage.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </article>
                ))}
              </div>
              {stages.length > 0 && practices.length > 0 && (
                <form onSubmit={saveAssignment} className="grid gap-3 rounded-xl border border-white/10 bg-[#19202e] p-4 md:grid-cols-3">
                  <label className="text-xs text-[#d0c5af]">Journey stage
                    <select required className={`${inputClass} mt-1`} value={assignmentDraft.stage_id}
                      onChange={event => setAssignmentDraft(current => ({ ...current, stage_id: event.target.value }))}>
                      <option value="">Choose stage</option>
                      {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.stage_number}. {stage.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-[#d0c5af]">Meditation practice
                    <select required className={`${inputClass} mt-1`} value={assignmentDraft.practice_id}
                      onChange={event => setAssignmentDraft(current => ({ ...current, practice_id: event.target.value }))}>
                      <option value="">Choose practice</option>
                      {practices.map(practice => <option key={practice.id} value={practice.id}>{practice.name}</option>)}
                    </select>
                  </label>
                  <button disabled={saving} className="self-end rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Assign practice</button>
                </form>
              )}
              {assignments.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#19202e] px-3 py-2 text-xs">
                  <span>{stages.find(stage => stage.id === item.stage_id)?.name ?? 'Unknown stage'} · {practices.find(practice => practice.id === item.practice_id)?.name ?? 'Unknown practice'} · #{item.sequence_number}</span>
                  <button onClick={() => void deleteRecord('assignments', item.id, () => setAssignments(current => current.filter(row => row.id !== item.id)))}
                    className="text-red-200">Remove</button>
                </div>
              ))}
            </section>
          )}

          {section === 'recommendations' && (
            <section className="space-y-4">
              <form onSubmit={saveRecommendation} className="grid max-w-3xl gap-4 rounded-2xl border border-white/10 bg-[#19202e] p-5 md:grid-cols-2">
                <label className="text-xs text-[#d0c5af]">Practice
                  <select required className={`${inputClass} mt-1`} value={recommendationDraft.practice_id ?? ''}
                    onChange={event => setRecommendationDraft(current => ({ ...current, practice_id: event.target.value }))}>
                    <option value="">Choose practice</option>
                    {practices.map(practice => <option key={practice.id} value={practice.id}>{practice.name}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[#d0c5af]">Recommendation date
                  <input required type="date" className={`${inputClass} mt-1`} value={recommendationDraft.recommendation_date ?? ''}
                    onChange={event => setRecommendationDraft(current => ({ ...current, recommendation_date: event.target.value }))} />
                </label>
                <label className="text-xs text-[#d0c5af]">Title
                  <input className={`${inputClass} mt-1`} value={recommendationDraft.title ?? ''}
                    onChange={event => setRecommendationDraft(current => ({ ...current, title: event.target.value }))} />
                </label>
                <label className="text-xs text-[#d0c5af]">Description
                  <input className={`${inputClass} mt-1`} value={recommendationDraft.description ?? ''}
                    onChange={event => setRecommendationDraft(current => ({ ...current, description: event.target.value }))} />
                </label>
                <button disabled={saving || !recommendationDraft.practice_id}
                  className="rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Save daily recommendation</button>
              </form>
              <div className="space-y-2">
                {recommendations.map(item => (
                  <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#19202e] p-3">
                    <div>
                      <p className="text-sm text-[#f2ca50]">{practices.find(practice => practice.id === item.practice_id)?.name ?? 'Unknown practice'}</p>
                      <p className="text-xs text-[#d0c5af]/60">{item.recommendation_date} · {item.title || 'No title'} · {item.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setRecommendationDraft({ ...item })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Edit</button>
                      <button onClick={() => void deleteRecord('recommendations', item.id, () =>
                        setRecommendations(current => current.filter(row => row.id !== item.id)))}
                        className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-200">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === 'tracking' && (
            <section className="space-y-4">
              <label className="block max-w-xs text-xs text-[#d0c5af]">Period
                <select className={`${inputClass} mt-1`} value={analyticsDays}
                  onChange={event => setAnalyticsDays(Number(event.target.value) as 7 | 30 | 90)}>
                  <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Active users', analytics?.active_users ?? 0],
                  ['Started sessions', analytics?.started_sessions ?? 0],
                  ['Completed sessions', analytics?.completed_sessions ?? 0],
                  ['Completion rate', `${analytics?.completion_rate ?? 0}%`],
                  ['Active minutes', analytics?.active_minutes ?? 0],
                  ['Average completed minutes', analytics?.average_completed_minutes ?? 0],
                  ['XP awarded', analytics?.xp_awarded ?? 0],
                  ['Synced to Sadhana', analytics?.sadhana_synced_sessions ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-[#19202e] p-5">
                    <p className="text-xs uppercase text-[#d0c5af]/60">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#f2ca50]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-[#19202e] text-[#f2ca50]">
                    <tr>{['Customer', 'Practice', 'Status', 'Duration', 'Completion', 'XP', 'Sadhana', 'Started'].map(label =>
                      <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id} className="border-t border-white/10 text-[#d0c5af]">
                        <td className="px-3 py-3">{session.user_name}<br /><span className="text-[#d0c5af]/60">{session.user_email}</span></td>
                        <td className="px-3 py-3">{session.practice_name}{session.stage_name && <><br /><span className="text-[#d0c5af]/60">{session.stage_name}</span></>}</td>
                        <td className="px-3 py-3 capitalize">{session.status}</td>
                        <td className="px-3 py-3">{Math.round(session.elapsed_duration_seconds / 60)} / {Math.round(session.planned_duration_seconds / 60)} min</td>
                        <td className="px-3 py-3">{Math.round(session.completion_percentage)}%</td>
                        <td className="px-3 py-3">{session.xp_awarded}</td>
                        <td className="px-3 py-3">{session.sadhana_synced ? 'Synced' : 'Not synced'}</td>
                        <td className="px-3 py-3">{new Date(session.started_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {sessions.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-[#d0c5af]/70">No meditation sessions in this period.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#d0c5af]/60">Showing the latest 100 sessions. Customer records are read-only here.</p>
            </section>
          )}
        </>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4">
          <section className="mx-auto my-6 max-w-5xl space-y-5 rounded-2xl border border-white/10 bg-[#19202e] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif-headline text-xl font-bold text-[#f2ca50]">{draft.id ? 'Manage meditation' : 'Create meditation'}</h2>
              <button onClick={() => setEditorOpen(false)} aria-label="Close meditation editor" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm">Close</button>
            </div>
            <form onSubmit={savePractice} className="grid gap-4 md:grid-cols-2">
              <label><span className={labelClass}>Name</span><input required className={inputClass} value={draft.name ?? ''} onChange={event => {
                const name = event.target.value;
                setDraft(current => ({ ...current, name, ...(!current.id ? { slug: slugify(name) } : {}) }));
              }} /></label>
              <label><span className={labelClass}>Slug</span><input required className={inputClass} value={draft.slug ?? ''} onChange={event => setPracticeField('slug', event.target.value)} /></label>
              <label><span className={labelClass}>Subtitle</span><input className={inputClass} value={draft.subtitle ?? ''} onChange={event => setPracticeField('subtitle', event.target.value)} /></label>
              <label><span className={labelClass}>Meditation type</span>
                <select className={inputClass} value={draft.meditation_type ?? 'guided'} onChange={event => setPracticeField('meditation_type', event.target.value)}>
                  {['guided', 'silent', 'breathing', 'mantra', 'visualization', 'mindfulness', 'relaxation', 'other'].map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>Difficulty</span>
                <select className={inputClass} value={draft.difficulty ?? 'beginner'} onChange={event => setPracticeField('difficulty', event.target.value as MeditationPractice['difficulty'])}>
                  {['beginner', 'intermediate', 'advanced'].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>Category</span>
                <select className={inputClass} value={draft.category_id ?? ''} onChange={event => setPracticeField('category_id', event.target.value || null)}>
                  <option value="">No category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>Journey stage (optional)</span>
                <select className={inputClass} value={draft.stage_id ?? ''} onChange={event => setPracticeField('stage_id', event.target.value || null)}>
                  <option value="">No stage</option>{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.stage_number}. {stage.name}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>Default duration (seconds)</span>
                <input required type="number" min={1} className={inputClass} value={draft.default_duration_seconds ?? 600}
                  onChange={event => setPracticeField('default_duration_seconds', Number(event.target.value))} />
              </label>
              <label className="md:col-span-2"><span className={labelClass}>Available durations in seconds (comma separated)</span>
                <input required className={inputClass} value={durationText} onChange={event => setDurationText(event.target.value)} placeholder="180, 300, 600, 900" />
              </label>
              <label className="md:col-span-2"><span className={labelClass}>Description</span>
                <textarea rows={3} className={inputClass} value={draft.description ?? ''} onChange={event => setPracticeField('description', event.target.value)} />
              </label>
              <label className="md:col-span-2"><span className={labelClass}>Instructions / guided script</span>
                <textarea rows={4} className={inputClass} value={draft.instructions ?? ''} onChange={event => setPracticeField('instructions', event.target.value)} />
              </label>
              <label><span className={labelClass}>Benefits (comma separated)</span>
                <input className={inputClass} value={(draft.benefits ?? []).join(', ')} onChange={event =>
                  setPracticeField('benefits', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} />
              </label>
              <label><span className={labelClass}>Tags (comma separated)</span>
                <input className={inputClass} value={(draft.tags ?? []).join(', ')} onChange={event =>
                  setPracticeField('tags', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} />
              </label>
              <div>
                <label><span className={labelClass}>Cover image URL</span><input type="url" className={inputClass} value={draft.cover_image_url ?? ''} onChange={event => setPracticeField('cover_image_url', event.target.value || null)} /></label>
                <label className="mt-2 block text-[11px] text-[#d0c5af]/70">{uploading ? 'Uploading…' : 'Or upload a cover image to Cloudflare R2'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="mt-1 block w-full"
                    onChange={event => { const file = event.target.files?.[0]; if (file) void uploadCover(file); event.currentTarget.value = ''; }} />
                </label>
              </div>
              <label><span className={labelClass}>Display order</span><input type="number" min={0} className={inputClass} value={draft.display_order ?? 0} onChange={event => setPracticeField('display_order', Number(event.target.value))} /></label>
              <div className="flex flex-wrap gap-4 md:col-span-2">
                {([
                  ['requires_audio', 'Requires guided audio'],
                  ['has_ambient_audio', 'Ambient audio available'],
                  ['has_bell', 'Start/end bell'],
                  ['allow_silent_mode', 'Allow silent mode'],
                  ['is_featured', 'Featured'],
                  ['is_active', 'Published / active'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 text-xs text-[#d0c5af]">
                    <input type="checkbox" checked={Boolean(draft[field])} onChange={event => setPracticeField(field, event.target.checked)} />{label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Close</button>
                <button disabled={saving} className="rounded-lg bg-[#f2ca50] px-5 py-2 text-sm font-bold text-[#3c2f00]">{saving ? 'Saving…' : 'Save practice'}</button>
              </div>
            </form>

            {draft.id && <div className="grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-2">
              <section className="space-y-3">
                <h3 className="font-semibold text-[#f2ca50]">Translations</h3>
                <div className="flex flex-wrap gap-2">{translations.map(item => (
                  <button key={item.id} onClick={() => setTranslationDraft({ ...item })}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">{item.language_code.toUpperCase()} · {item.display_name}</button>
                ))}</div>
                <button onClick={() => setTranslationDraft({
                  practice_id: draft.id,
                  language_code: 'en',
                  display_name: draft.name ?? '',
                  subtitle: draft.subtitle ?? '',
                  description: draft.description ?? '',
                  instructions: draft.instructions ?? '',
                  benefits: [],
                })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Add translation</button>
                {translationDraft && <form onSubmit={saveTranslation} className="space-y-2 rounded-xl bg-[#0c1321] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inputClass} value={translationDraft.language_code ?? 'en'} onChange={event =>
                      setTranslationDraft(current => current && ({ ...current, language_code: event.target.value as MeditationLanguage }))}>
                      {LANGUAGES.map(language => <option key={language} value={language}>{language.toUpperCase()}</option>)}
                    </select>
                    <input required aria-label="Translation display name" className={inputClass} value={translationDraft.display_name ?? ''}
                      onChange={event => setTranslationDraft(current => current && ({ ...current, display_name: event.target.value }))} placeholder="Display name" />
                  </div>
                  {(['subtitle', 'description', 'instructions'] as const).map(field => (
                    <label key={field}><span className={labelClass}>{field}</span>
                      <textarea rows={2} className={inputClass} value={translationDraft[field] ?? ''}
                        onChange={event => setTranslationDraft(current => current && ({ ...current, [field]: event.target.value }))} />
                    </label>
                  ))}
                  <div className="flex gap-2">
                    <button disabled={saving} className="rounded-lg bg-[#f2ca50] px-3 py-1.5 text-xs font-bold text-[#3c2f00]">Save translation</button>
                    {translationDraft.id && <button type="button" onClick={() => void deleteRecord('translations', translationDraft.id!,
                      () => setTranslations(current => current.filter(item => item.id !== translationDraft.id)))}
                      className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-200">Delete</button>}
                  </div>
                </form>}
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-[#f2ca50]">Audio assets (Cloudflare R2)</h3>
                <label className="block text-[11px] text-[#d0c5af]/70">{uploading ? 'Uploading…' : 'Upload guided audio'}
                  <input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" disabled={uploading}
                    className="mt-1 block w-full" onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAudio(file);
                      event.currentTarget.value = '';
                    }} />
                </label>
                <ul className="space-y-1 text-xs text-[#d0c5af]/80">
                  {audioAssets.map(asset => <li key={asset.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0c1321] px-3 py-2">
                    {asset.public_url
                      ? <a href={asset.public_url} target="_blank" rel="noreferrer" className="truncate underline">{asset.title} · {asset.language_code ?? 'no language'}</a>
                      : <span className="truncate">{asset.title} · R2 object unavailable</span>}
                    <button onClick={() => void changeAudioActive(asset)} className="shrink-0">
                      {asset.is_active ? 'Unpublish' : 'Publish'}
                    </button>
                  </li>)}
                  {audioAssets.length === 0 && <li className="text-[#d0c5af]/60">No audio assets yet.</li>}
                </ul>
              </section>

              <section className="space-y-3 lg:col-span-2">
                <h3 className="font-semibold text-[#f2ca50]">Session phases</h3>
                {phases.map(phase => (
                  <div key={phase.id} className="flex items-center justify-between rounded-lg bg-[#0c1321] px-3 py-2 text-xs">
                    <span>{phase.display_order + 1}. {phase.phase_name} · {phase.duration_seconds}s</span>
                    <div className="flex gap-3">
                      <button onClick={() => setPhaseDraft({ ...phase })}>Edit</button>
                      <button onClick={() => void deleteRecord('phases', phase.id, () =>
                        setPhases(current => current.filter(item => item.id !== phase.id)))} className="text-red-200">Delete</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setPhaseDraft({ phase_type: 'meditation', phase_name: '', instructions: '', duration_seconds: 60, display_order: phases.length })}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Add session phase</button>
                {phaseDraft && <form onSubmit={savePhase} className="grid gap-2 rounded-xl bg-[#0c1321] p-3 md:grid-cols-2">
                  <input required aria-label="Phase name" className={inputClass} value={phaseDraft.phase_name ?? ''}
                    onChange={event => setPhaseDraft(current => current && ({ ...current, phase_name: event.target.value }))} placeholder="Phase name" />
                  <select aria-label="Phase type" className={inputClass} value={phaseDraft.phase_type ?? 'meditation'}
                    onChange={event => setPhaseDraft(current => current && ({ ...current, phase_type: event.target.value }))}>
                    {PHASE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <input aria-label="Phase duration in seconds" required type="number" min={0} max={7200} className={inputClass}
                    value={phaseDraft.duration_seconds ?? 60} onChange={event => setPhaseDraft(current => current && ({ ...current, duration_seconds: Number(event.target.value) }))} />
                  <textarea aria-label="Phase instructions" rows={2} className={inputClass} value={phaseDraft.instructions ?? ''}
                    onChange={event => setPhaseDraft(current => current && ({ ...current, instructions: event.target.value }))} placeholder="Phase instructions" />
                  <div className="flex gap-2 md:col-span-2">
                    <button disabled={saving} className="rounded-lg bg-[#f2ca50] px-3 py-1.5 text-xs font-bold text-[#3c2f00]">Save phase</button>
                    <button type="button" onClick={() => setPhaseDraft(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Cancel</button>
                  </div>
                </form>}
              </section>
            </div>}
          </section>
        </div>
      )}

      {(categoryDraft || stageDraft) && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/80 p-4">
          <form onSubmit={categoryDraft ? saveCategory : saveStage} className="my-8 w-full max-w-xl space-y-3 rounded-2xl border border-white/10 bg-[#19202e] p-5">
            <h2 className="font-semibold text-[#f2ca50]">{categoryDraft ? 'Meditation category' : 'Meditation journey stage'}</h2>
            <label><span className={labelClass}>Name</span><input required className={inputClass} value={(categoryDraft ?? stageDraft)?.name ?? ''}
              onChange={event => categoryDraft
                ? setCategoryDraft(current => current && ({ ...current, name: event.target.value, ...(!current.id ? { slug: slugify(event.target.value) } : {}) }))
                : setStageDraft(current => current && ({ ...current, name: event.target.value, ...(!current.id ? { slug: slugify(event.target.value) } : {}) }))} /></label>
            <label><span className={labelClass}>Slug</span><input required className={inputClass} value={(categoryDraft ?? stageDraft)?.slug ?? ''}
              onChange={event => categoryDraft
                ? setCategoryDraft(current => current && ({ ...current, slug: event.target.value }))
                : setStageDraft(current => current && ({ ...current, slug: event.target.value }))} /></label>
            <label><span className={labelClass}>Description</span><textarea rows={2} className={inputClass} value={(categoryDraft ?? stageDraft)?.description ?? ''}
              onChange={event => categoryDraft
                ? setCategoryDraft(current => current && ({ ...current, description: event.target.value }))
                : setStageDraft(current => current && ({ ...current, description: event.target.value }))} /></label>
            {categoryDraft ? <>
              <label><span className={labelClass}>Display order</span><input type="number" min={0} className={inputClass} value={categoryDraft.display_order ?? 0}
                onChange={event => setCategoryDraft(current => current && ({ ...current, display_order: Number(event.target.value) }))} /></label>
              <label className="flex items-center gap-2 text-xs text-[#d0c5af]"><input type="checkbox" checked={categoryDraft.is_active ?? false}
                onChange={event => setCategoryDraft(current => current && ({ ...current, is_active: event.target.checked }))} />Active</label>
              <label><span className={labelClass}>Cover image URL</span><input type="url" className={inputClass} value={categoryDraft.cover_image_url ?? ''}
                onChange={event => setCategoryDraft(current => current && ({ ...current, cover_image_url: event.target.value || null }))} /></label>
            </> : <>
              <label><span className={labelClass}>Category</span><select required className={inputClass} value={stageDraft?.category_id ?? ''}
                onChange={event => setStageDraft(current => current && ({ ...current, category_id: event.target.value }))}>
                <option value="">Choose category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select></label>
              <label><span className={labelClass}>Stage number</span><input required type="number" min={1} className={inputClass} value={stageDraft?.stage_number ?? stages.length + 1}
                onChange={event => setStageDraft(current => current && ({ ...current, stage_number: Number(event.target.value) }))} /></label>
              <label><span className={labelClass}>Estimated duration (minutes)</span><input required type="number" min={1} max={120} className={inputClass} value={stageDraft?.estimated_duration_minutes ?? 5}
                onChange={event => setStageDraft(current => current && ({ ...current, estimated_duration_minutes: Number(event.target.value) }))} /></label>
              <label><span className={labelClass}>Difficulty</span><select className={inputClass} value={stageDraft?.difficulty ?? 'beginner'}
                onChange={event => setStageDraft(current => current && ({ ...current, difficulty: event.target.value as MeditationStage['difficulty'] }))}>
                {['beginner', 'intermediate', 'advanced'].map(value => <option key={value}>{value}</option>)}
              </select></label>
              <label><span className={labelClass}>Display order</span><input type="number" min={0} className={inputClass} value={stageDraft?.display_order ?? stages.length}
                onChange={event => setStageDraft(current => current && ({ ...current, display_order: Number(event.target.value) }))} /></label>
              <label className="flex items-center gap-2 text-xs text-[#d0c5af]"><input type="checkbox" checked={stageDraft?.is_active ?? false}
                onChange={event => setStageDraft(current => current && ({ ...current, is_active: event.target.checked }))} />Active</label>
            </>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setCategoryDraft(null); setStageDraft(null); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

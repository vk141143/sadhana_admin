import { parseFestivalSections } from '../services/festivalValidation';
import React, { useState } from 'react';
import { FestivalContent, FestivalMedia } from '../types';
import { uploadFestivalJsonToR2 } from '../services/r2Client';
import { insertFestivalMedia, upsertContent } from '../services/festivalService';

interface Props {
  onUploading: (busy: boolean) => void;
  festivalId: string | null;
  festivalSlug?: string;
  festivalYear?: number;
  content: Partial<FestivalContent>;
  setContent: (c: Partial<FestivalContent>) => void;
  media: FestivalMedia[];
  setMedia: (m: FestivalMedia[]) => void;
}

const parseTextToSections = parseFestivalSections;

export const Step4Content: React.FC<Props> = ({
  onUploading, festivalId, festivalSlug, festivalYear, content, setContent, media, setMedia,
}) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState<'story' | 'puja' | null>(null);
  const [storyText, setStoryText] = useState(
    (content.festival_story as any[])?.map((s: any) => `## ${s.title}\n${s.content}`).join('\n\n') || ''
  );
  const [pujaText, setPujaText] = useState(
    (content.puja_vidhi as any[])?.map((s: any) => `## ${s.title}\n${s.content}`).join('\n\n') || ''
  );

  const setField = (field: keyof FestivalContent, val: any) =>
    setContent({ ...content, [field]: val });

  const uploadJson = async (type: 'story' | 'puja') => {
    if (!festivalId) { alert('Save Draft first to enable uploads.'); return; }
    const sections = type === 'story'
      ? parseTextToSections(storyText)
      : parseTextToSections(pujaText);
    if (!sections.length) { alert('Add some content first.'); return; }
    const payload = { title: type === 'story' ? 'Festival Story' : 'Puja Vidhi', sections };
    try {
      setUploading(type); onUploading(true); setMessage('');
      const slug = festivalSlug || festivalId;
      const year = festivalYear ?? new Date().getFullYear();
      const { key, url } = await uploadFestivalJsonToR2(payload, festivalId, type, year, setProgress);
      const saved = await insertFestivalMedia(festivalId, {
        media_type: type === 'story' ? 'story_json' : 'puja_json',
        r2_key: key, storage_key: key, public_url: url,
        file_name: type === 'story' ? 'story.json' : 'puja-vidhi.json',
        mime_type: 'application/json', file_size: new Blob([JSON.stringify(payload, null, 2)]).size,
        sort_order: media.length, display_order: media.length,
        title: '', description: '', language_code: '', alt_text: '', caption: '',
        duration_seconds: null, created_by: null, occurrence_id: null, is_cover: false,
      });
      setMedia([...media.filter(m => m.id !== saved.id), saved]);
      const updated = { ...content, [`${type}_r2_url`]: url, [`${type}_r2_key`]: key };
      setContent(updated);
      const persisted = await upsertContent(festivalId, updated, content.occurrence_id);
      setContent({ ...updated, id: persisted.id });
      setMessage('R2 upload and content reference saved.');
    } catch (e) { setMessage((e instanceof Error ? e.message : 'Upload failed.') + ' Retry the upload button; completed uploads are reused in this tab.'); }
    finally { setUploading(null); onUploading(false); }
  };

  const noId = (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
      <span className="material-symbols-outlined text-sm">info</span>
      Click <strong>Save Draft</strong> first to enable R2 uploads.
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Content</h3>
        <p className="text-xs text-[#d0c5af]/70">Description, story, and scriptural references. JSON files go to Cloudflare R2.</p>
      </div>
      {!festivalId && noId}
      {message && <p role="status" className="text-sm text-amber-300">{message}</p>}
      {uploading && <progress value={progress} max={100} aria-label="Content upload progress" />}

      <div>
        <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Festival Description</label>
        <textarea value={content.festival_description || ''} onChange={e => setField('festival_description', e.target.value)}
          placeholder="Full description of the festival…" rows={4}
          className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none resize-none" />
      </div>

      <div>
        <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Spiritual Significance</label>
        <textarea value={content.spiritual_significance || ''} onChange={e => setField('spiritual_significance', e.target.value)}
          placeholder="Spiritual significance…" rows={3}
          className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none resize-none" />
      </div>

      {/* Story */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#f2ca50]">Festival Story</p>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">Use <code className="text-[#f2ca50]">## Section Title</code> to split. Saved as JSON in R2.</p>
          </div>
          {content.story_r2_url && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span>Uploaded</span>}
        </div>
        <textarea value={storyText} onChange={e => { setStoryText(e.target.value); setField('festival_story', parseTextToSections(e.target.value)); }}
          onBlur={() => setField('festival_story', parseTextToSections(storyText))}
          placeholder={'## The Story\nWrite here...\n\n## Significance\nWrite here...'}
          rows={6} className="w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none resize-none font-mono" />
        <button onClick={() => uploadJson('story')} disabled={uploading === 'story' || !festivalId}
          className="flex items-center gap-2 px-4 py-2 bg-[#19202e] border border-white/10 rounded-lg text-xs font-semibold text-[#dce2f6] hover:bg-white/10 transition-colors disabled:opacity-40">
          {uploading === 'story'
            ? <><span className="animate-spin material-symbols-outlined text-sm">hourglass_empty</span>Uploading…</>
            : <><span className="material-symbols-outlined text-sm">upload_file</span>Upload Story JSON to R2</>}
        </button>
      </div>

      {/* Puja Vidhi */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#f2ca50]">Puja Vidhi (R2 JSON)</p>
            <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">Use <code className="text-[#f2ca50]">## Section Title</code> to split. Saved as JSON in R2.</p>
          </div>
          {content.puja_r2_url && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span>Uploaded</span>}
        </div>
        <textarea value={pujaText} onChange={e => { setPujaText(e.target.value); setField('puja_vidhi', parseTextToSections(e.target.value)); }}
          onBlur={() => setField('puja_vidhi', parseTextToSections(pujaText))}
          placeholder={'## Samagri\nList items...\n\n## Puja Steps\nStep by step...'}
          rows={6} className="w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none resize-none font-mono" />
        <button onClick={() => uploadJson('puja')} disabled={uploading === 'puja' || !festivalId}
          className="flex items-center gap-2 px-4 py-2 bg-[#19202e] border border-white/10 rounded-lg text-xs font-semibold text-[#dce2f6] hover:bg-white/10 transition-colors disabled:opacity-40">
          {uploading === 'puja'
            ? <><span className="animate-spin material-symbols-outlined text-sm">hourglass_empty</span>Uploading…</>
            : <><span className="material-symbols-outlined text-sm">upload_file</span>Upload Puja Vidhi JSON to R2</>}
        </button>
      </div>
    </div>
  );
};

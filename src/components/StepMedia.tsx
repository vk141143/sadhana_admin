import React, { useState } from 'react';
import { FestivalMedia } from '../types';
import { uploadFestivalMediaToR2 } from '../services/r2Client';
import { insertFestivalMedia, deleteFestivalMedia, setCoverMedia } from '../services/festivalService';

interface Props {
  festivalId: string | null;
  festivalSlug?: string;
  festivalYear?: number;
  media: FestivalMedia[];
  setMedia: (m: FestivalMedia[]) => void;
}

type UploadKey = 'image' | 'audio' | 'video';

export const StepMedia: React.FC<Props> = ({ festivalId, festivalSlug, festivalYear, media, setMedia }) => {
  const [uploading, setUploading] = useState<UploadKey | null>(null);

  const noId = (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
      <span className="material-symbols-outlined text-sm">info</span>
      Click <strong>Save Draft</strong> first to enable file uploads.
    </div>
  );

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>, type: UploadKey) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !festivalId) return;
    try {
      setUploading(type);
      const slug = festivalSlug || festivalId;
      const year = festivalYear ?? new Date().getFullYear();
      const newItems: FestivalMedia[] = [];
      for (const file of files) {
        const { key, url } = await uploadFestivalMediaToR2(file, slug, type, year);
        const saved = await insertFestivalMedia(festivalId, {
          media_type: type,
          r2_key: key, storage_key: key, public_url: url,
          file_name: file.name, mime_type: file.type, file_size: file.size,
          sort_order: media.length + newItems.length,
          display_order: media.length + newItems.length,
          title: '', description: '', language_code: '', alt_text: '', caption: '',
          duration_seconds: null, created_by: null, occurrence_id: null, is_cover: false,
        });
        newItems.push(saved);
      }
      setMedia([...media, ...newItems]);
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleDelete = async (item: FestivalMedia) => {
    try {
      await deleteFestivalMedia(item.id);
      setMedia(media.filter(m => m.id !== item.id));
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleSetCover = async (item: FestivalMedia) => {
    if (!festivalId) return;
    try {
      await setCoverMedia(festivalId, item.id);
      setMedia(media.map(m => ({ ...m, is_cover: m.id === item.id })));
    } catch (err) {
      alert('Failed to set cover: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const images = media.filter(m => m.media_type === 'image' || m.media_type === 'gallery' || m.media_type === 'banner');
  const audios = media.filter(m => m.media_type === 'audio');
  const videos = media.filter(m => m.media_type === 'video');

  const uploadZone = (type: UploadKey, accept: string, icon: string, label: string, multiple = false) => (
    <label className={`flex items-center gap-3 p-3 border border-dashed rounded-lg transition-colors ${
      festivalId ? 'border-white/10 cursor-pointer hover:border-[#f2ca50]/50' : 'border-white/5 opacity-40 cursor-not-allowed'
    }`}>
      <span className="material-symbols-outlined text-[#f2ca50]/60">{icon}</span>
      <span className="text-xs text-[#d0c5af]/60">
        {uploading === type ? 'Uploading…' : label}
      </span>
      <input type="file" accept={accept} multiple={multiple}
        onChange={e => uploadFiles(e, type)}
        disabled={!!uploading || !festivalId}
        className="hidden" />
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Media</h3>
        <p className="text-xs text-[#d0c5af]/70">All files upload to Cloudflare R2 — only URLs stored in Supabase.</p>
      </div>

      {!festivalId && noId}

      {/* Images */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Festival Images</p>
        {uploadZone('image', 'image/*', 'add_photo_alternate', 'Click to upload images (multiple allowed)', true)}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map(m => (
              <div key={m.id} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square">
                <img src={m.public_url} alt={m.file_name} className="w-full h-full object-cover" />
                {m.is_cover && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#f2ca50] text-[#3c2f00] text-[9px] font-bold rounded">
                    COVER
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!m.is_cover && (
                    <button onClick={() => handleSetCover(m)}
                      className="p-1.5 bg-[#f2ca50] text-[#3c2f00] rounded-lg"
                      title="Set as cover">
                      <span className="material-symbols-outlined text-xs">star</span>
                    </button>
                  )}
                  <button onClick={() => handleDelete(m)}
                    className="p-1.5 bg-rose-500/80 text-white rounded-lg"
                    title="Delete">
                    <span className="material-symbols-outlined text-xs">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audio */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Audio <span className="text-[#d0c5af]/40 font-normal">(Optional)</span></p>
        {uploadZone('audio', 'audio/*', 'audio_file', 'Click to upload audio')}
        {audios.map(m => (
          <div key={m.id} className="flex items-center justify-between p-2 bg-[#19202e] rounded-lg border border-white/10">
            <span className="text-xs text-[#dce2f6] truncate flex-1">{m.file_name}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <audio controls src={m.public_url} className="h-7 w-32" />
              <button onClick={() => handleDelete(m)} className="p-1 text-rose-400 hover:text-rose-300">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Video */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Video <span className="text-[#d0c5af]/40 font-normal">(Optional)</span></p>
        {uploadZone('video', 'video/*', 'video_file', 'Click to upload video')}
        {videos.map(m => (
          <div key={m.id} className="space-y-1">
            <video controls src={m.public_url} className="w-full rounded-lg border border-white/10 max-h-40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#d0c5af]/60 truncate">{m.file_name}</span>
              <button onClick={() => handleDelete(m)} className="p-1 text-rose-400 hover:text-rose-300">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

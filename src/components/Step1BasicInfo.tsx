import React, { useState } from 'react';
import { uploadFestivalMediaToR2 } from '../services/r2Client';
import { insertFestivalMedia } from '../services/festivalService';

const FESTIVAL_TYPES = ['Major Festival', 'Ekadashi', 'Purnima', 'Amavasya', 'Jayanti', 'Vrata', 'Utsava', 'Other'];
const TRADITIONS = [
  { value: 'general',   label: 'General / Universal' },
  { value: 'vaishnava', label: 'Vaishnava' },
  { value: 'shaiva',    label: 'Shaiva' },
  { value: 'shakta',    label: 'Shakta' },
  { value: 'smarta',    label: 'Smarta' },
  { value: 'other',     label: 'Other' },
];

const ipt = 'w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';
const lbl = 'text-xs font-semibold text-[#f2ca50] block mb-1.5';

interface Props {
  festivalId: string | null;
  formData: any;
  setFormData: (d: any) => void;
  bannerUrl: string;
  setBannerUrl: (u: string) => void;
}

export const Step1BasicInfo: React.FC<Props> = ({
  festivalId, formData, setFormData, bannerUrl, setBannerUrl,
}) => {
  const [uploading, setUploading] = useState(false);

  const set = (field: string, value: string | boolean) => setFormData({ ...formData, [field]: value });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setFormData({ ...formData, name, slug: formData.slug || slug });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!festivalId) {
      setBannerUrl(URL.createObjectURL(file));
      setFormData({ ...formData, _pendingBannerFile: file });
      return;
    }

    try {
      setUploading(true);
      const slug = formData.slug || festivalId;
      const year = new Date().getFullYear();
      const { key, url } = await uploadFestivalMediaToR2(file, slug, 'image', year);
      await insertFestivalMedia(festivalId, {
        media_type: 'image',
        r2_key: key,
        storage_key: key,
        public_url: url,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        is_cover: true,
        sort_order: 0,
        display_order: 0,
        title: 'Cover', description: '', language_code: '', alt_text: '', caption: '',
        duration_seconds: null, created_by: null, occurrence_id: null,
      });
      setBannerUrl(url);
    } catch (err) {
      alert('Image upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Festival Details</h3>
        <p className="text-xs text-[#d0c5af]/70">Core identity of this festival.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Festival Name <span className="text-rose-400">*</span></label>
          <input className={ipt} value={formData.name || ''} onChange={e => handleNameChange(e.target.value)} placeholder="e.g., Krishna Janmashtami" />
        </div>
        <div>
          <label className={lbl}>Alternate Name</label>
          <input className={ipt} value={formData.alternate_name || ''} onChange={e => set('alternate_name', e.target.value)} placeholder="e.g., Gokulashtami" />
        </div>
        <div>
          <label className={lbl}>Festival Type <span className="text-rose-400">*</span></label>
          <select className={ipt} value={formData.festival_type || 'Major Festival'} onChange={e => set('festival_type', e.target.value)}>
            {FESTIVAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Tradition</label>
          <select className={ipt} value={formData.tradition || 'general'} onChange={e => set('tradition', e.target.value)}>
            {TRADITIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Primary Deity</label>
          <input className={ipt} value={formData.primary_deity || ''} onChange={e => set('primary_deity', e.target.value)} placeholder="e.g., Lord Krishna" />
        </div>
        <div>
          <label className={lbl}>Festival Slug</label>
          <input className={ipt} value={formData.slug || ''} onChange={e => set('slug', e.target.value)} placeholder="e.g., krishna-janmashtami" />
          <p className="text-[10px] text-[#d0c5af]/40 mt-1">Auto-generated from name. Used in URLs.</p>
        </div>
      </div>

      <div>
        <label className={lbl}>Short Description <span className="text-rose-400">*</span></label>
        <textarea
          className={ipt}
          value={formData.short_description || ''}
          onChange={e => set('short_description', e.target.value)}
          placeholder="Brief description shown in festival cards..."
          rows={2}
        />
      </div>

      {/* Cover Image */}
      <div>
        <label className={lbl}>Festival Cover Image</label>
        <label className="block cursor-pointer">
          {bannerUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10 h-44">
              <img src={bannerUrl} alt="Festival cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-semibold">Click to change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/10 rounded-xl hover:border-[#f2ca50]/50 transition-colors">
              <span className="material-symbols-outlined text-3xl text-[#f2ca50]/50 mb-2">add_photo_alternate</span>
              <span className="text-xs text-[#d0c5af]/60">Click to upload cover image</span>
              {!festivalId && <span className="text-[10px] text-amber-400/70 mt-1">Save Draft first to upload directly to R2</span>}
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
        </label>
        {uploading && (
          <p className="text-xs text-[#f2ca50] flex items-center gap-1.5 mt-2">
            <span className="animate-spin material-symbols-outlined text-sm">hourglass_empty</span>Uploading to R2…
          </p>
        )}
      </div>

      {/* Status & Active */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Status</label>
          <select className={ipt} value={formData.status || 'Draft'} onChange={e => set('status', e.target.value)}>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#0c1321] rounded-xl border border-white/10 w-full">
            <div
              onClick={() => set('is_active', !(formData.is_active ?? true))}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                (formData.is_active ?? true) ? 'bg-[#f2ca50]' : 'bg-white/10'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                (formData.is_active ?? true) ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#dce2f6]">Active</p>
              <p className="text-[10px] text-[#d0c5af]/50">Visible in app when Published</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

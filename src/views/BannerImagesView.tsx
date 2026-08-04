import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadToR2 } from '../services/r2Client';

interface BannerImage {
  id: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Wizard steps ──────────────────────────────────────────────
const STEPS = [
  { label: 'Upload Image', icon: 'cloud_upload' },
  { label: 'Confirm & Save', icon: 'check_circle' },
];

const inputCls =
  'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';

export const BannerImagesView: React.FC = () => {
  const [banners, setBanners] = useState<BannerImage[]>([]);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // wizard / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<BannerImage | null>(null); // null = add mode
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // form fields
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchBanners(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBanners = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('banner_images')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) showToast(error.message, 'error');
    else setBanners((data as BannerImage[]) || []);
    setFetching(false);
  };

  // ── Modal helpers ─────────────────────────────────────────────
  const openAdd = () => {
    setEditBanner(null);
    setImageUrl('');
    setIsActive(false);
    setStep(0);
    setModalOpen(true);
  };

  const openEdit = (b: BannerImage) => {
    setEditBanner(b);
    setImageUrl(b.image_url);
    setIsActive(b.is_active);
    setStep(0);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditBanner(null); };

  const goStep = (next: number) => {
    if (animating) return;
    setAnimDir(next > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => { setStep(next); setAnimating(false); }, 220);
  };

  // ── Upload ────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, 'app-banners');
      setImageUrl(url);
      showToast('Image uploaded!');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    }
    setUploading(false);
  };

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!imageUrl.trim()) { showToast('Please upload or paste an image URL', 'error'); return; }
    setSaving(true);
    const payload = { image_url: imageUrl, is_active: isActive };
    const { error } = editBanner
      ? await supabase.from('banner_images').update(payload).eq('id', editBanner.id)
      : await supabase.from('banner_images').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editBanner ? 'Banner updated!' : 'Banner added!');
    closeModal();
    fetchBanners();
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner? This cannot be undone.')) return;
    const { error } = await supabase.from('banner_images').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Banner deleted');
    fetchBanners();
  };

  // ── Toggle active ─────────────────────────────────────────────
  const handleToggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from('banner_images').update({ is_active: !current }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(!current ? 'Activated!' : 'Deactivated');
    fetchBanners();
  };

  // ── Step content ──────────────────────────────────────────────
  const renderStep = () => {
    const slideClass = animating
      ? animDir === 'forward'
        ? 'opacity-0 translate-x-4'
        : 'opacity-0 -translate-x-4'
      : 'opacity-100 translate-x-0';

    if (step === 0) return (
      <div className={`transition-all duration-200 ease-out ${slideClass} space-y-4`}>
        <p className="text-xs text-[#d0c5af]/60 leading-relaxed">
          Upload a banner image to Cloudflare R2, or paste a direct URL below.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all
            ${imageUrl ? 'border-[#f2ca50]/40' : 'border-white/10 hover:border-[#f2ca50]/40 hover:bg-[#f2ca50]/5'}`}
        >
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="preview" className="w-full h-52 object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">swap_horiz</span>Replace
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-500 transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-[#d0c5af]/40">
              {uploading ? (
                <>
                  <span className="material-symbols-outlined text-4xl animate-spin text-[#f2ca50]">progress_activity</span>
                  <span className="text-xs text-[#f2ca50]">Uploading to R2...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                  <span className="text-xs font-semibold">Click to upload</span>
                  <span className="text-[10px]">PNG · JPG · WebP</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Paste URL */}
        <div>
          <label className="text-[10px] font-semibold text-[#f2ca50] block mb-1">Or paste image URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </div>
    );

    // Step 1 — Confirm
    return (
      <div className={`transition-all duration-200 ease-out ${slideClass} space-y-5`}>
        <p className="text-xs text-[#d0c5af]/60">Review your banner before saving.</p>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0c1321]">
          {imageUrl ? (
            <img src={imageUrl} alt="Banner" className="w-full h-44 object-cover" />
          ) : (
            <div className="h-44 flex items-center justify-center text-[#d0c5af]/30">
              <span className="material-symbols-outlined text-5xl">image</span>
            </div>
          )}
        </div>

        {/* URL display */}
        <div className="bg-[#0c1321] rounded-xl px-3 py-2.5 border border-white/10">
          <p className="text-[10px] text-[#d0c5af]/40 mb-0.5">Image URL</p>
          <p className="text-xs text-[#dce2f6] truncate">{imageUrl || '—'}</p>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer bg-[#0c1321] rounded-xl px-3 py-3 border border-white/10">
          <div
            onClick={() => setIsActive((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-[#f2ca50]' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isActive ? 'left-5' : 'left-0.5'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#dce2f6]">Set as Active</p>
            <p className="text-[10px] text-[#d0c5af]/40">Banner will be visible in the app immediately</p>
          </div>
        </label>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2 transition-all
          ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Banner Images</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            Manage app banners stored in Cloudflare R2.{' '}
            <span className="text-[#f2ca50] font-semibold">{banners.length}</span> total ·{' '}
            <span className="text-emerald-400 font-semibold">{banners.filter((b) => b.is_active).length}</span> active
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[#f2ca50]/10"
        >
          <span className="material-symbols-outlined text-base">add_photo_alternate</span>
          Add Banner
        </button>
      </div>

      {/* ── Table ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {fetching ? (
          <div className="flex items-center justify-center h-48">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#19202e] border-b-2 border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
                  <th className="py-4 px-4 w-20">Preview</th>
                  <th className="py-4 px-4">Image URL</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Added</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[#d0c5af]/40 text-sm">
                      No banners yet.{' '}
                      <button onClick={openAdd} className="text-[#f2ca50] underline underline-offset-2">Add one</button>
                    </td>
                  </tr>
                ) : banners.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-16 h-11 rounded-xl overflow-hidden bg-[#232a39] border border-white/10 flex items-center justify-center">
                        {b.image_url
                          ? <img src={b.image_url} alt="banner" className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-[#f2ca50]/30 text-xl">image</span>}
                      </div>
                    </td>

                    {/* URL */}
                    <td className="py-3 px-4 max-w-[280px]">
                      <p className="text-xs text-[#dce2f6] truncate group-hover:text-[#f2ca50] transition-colors">{b.image_url}</p>
                    </td>

                    {/* Status toggle */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(b.id, b.is_active)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:brightness-125
                          ${b.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}
                      >
                        {b.is_active ? '● Active' : '○ Hidden'}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-xs text-[#d0c5af]/40 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(b)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all"
                          title="Delete"
                        >
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

      {/* ── Wizard Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                  {editBanner ? 'Edit Banner' : 'Add New Banner'}
                </h3>
                <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">
                  Step {step + 1} of {STEPS.length} — {STEPS[step].label}
                </p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                      ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-white/10 text-[#d0c5af]/40'}`}>
                      {i < step
                        ? <span className="material-symbols-outlined text-[12px]">check</span>
                        : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold transition-colors ${i === step ? 'text-[#f2ca50]' : i < step ? 'text-emerald-400' : 'text-[#d0c5af]/30'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step body */}
            <div className="px-6 py-5 min-h-[280px]">
              {renderStep()}
            </div>

            {/* Footer nav */}
            <div className="px-6 pb-6 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                onClick={() => step === 0 ? closeModal() : goStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">{step === 0 ? 'close' : 'arrow_back'}</span>
                {step === 0 ? 'Cancel' : 'Back'}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => {
                    if (!imageUrl.trim()) { showToast('Please upload or paste an image URL', 'error'); return; }
                    goStep(step + 1);
                  }}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  <span className="material-symbols-outlined text-sm">save</span>
                  {saving ? 'Saving...' : editBanner ? 'Update Banner' : 'Save Banner'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

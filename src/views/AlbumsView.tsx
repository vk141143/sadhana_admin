import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadImageToR2 } from '../services/r2Client';

interface Album {
  id: string;
  title: string;
  artist: string;
  description: string;
  cover_url: string;
  status: 'Draft' | 'Premium' | 'Public';
  track_count: number;
  created_at: string;
}

const inputCls = 'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none transition-all';
const labelCls = 'text-[10px] font-semibold text-[#f2ca50] block mb-1.5';

export const AlbumsView: React.FC = () => {
  const [albums, setAlbums]       = useState<Album[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // Form
  const [title,       setTitle]       = useState('');
  const [artist,      setArtist]      = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState<Album['status']>('Draft');
  const [coverFile,   setCoverFile]   = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading,   setUploading]   = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchAlbums(); }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('albums').select('*').order('created_at', { ascending: false });
    if (error) showToast(error.message, 'error');
    else setAlbums((data as Album[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditAlbum(null);
    setTitle(''); setArtist(''); setDescription(''); setStatus('Draft');
    setCoverFile(null); setCoverPreview('');
    setModalOpen(true);
  };

  const openEdit = (a: Album) => {
    setEditAlbum(a);
    setTitle(a.title || ''); setArtist(a.artist || ''); setDescription(a.description || ''); setStatus(a.status || 'Draft');
    setCoverFile(null); setCoverPreview(a.cover_url || '');
    setModalOpen(true);
  };

  const handleCoverChange = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);

    let cover_url = editAlbum?.cover_url || '';
    if (coverFile) {
      setUploading(true);
      try { cover_url = await uploadImageToR2(coverFile, 'albums'); }
      catch (e: any) { showToast('Cover upload failed: ' + e.message, 'error'); setSaving(false); setUploading(false); return; }
      setUploading(false);
    }

    const payload = { title: title.trim(), artist: (artist || '').trim() || null, description: (description || '').trim() || null, status, cover_url };
    const { error } = editAlbum
      ? await supabase.from('albums').update(payload).eq('id', editAlbum.id)
      : await supabase.from('albums').insert(payload);

    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editAlbum ? 'Album updated!' : 'Album created!');
    setModalOpen(false);
    fetchAlbums();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('albums').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Album deleted');
    setDeleteTarget(null);
    fetchAlbums();
  };

  const statusColor = (s: Album['status']) =>
    s === 'Premium' ? 'bg-[#f2ca50]/10 text-[#f2ca50] border-[#f2ca50]/20' :
    s === 'Public'  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-white/5 text-[#d0c5af]/50 border-white/10';

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28 relative">

      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Albums</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            <span className="text-[#f2ca50] font-semibold">{albums.length}</span> collections
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[#f2ca50]/10">
          <span className="material-symbols-outlined text-base">add</span>Create Album
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
        </div>
      ) : albums.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <span className="material-symbols-outlined text-5xl text-[#d0c5af]/20">album</span>
          <p className="text-[#d0c5af]/40 text-sm">No albums yet. <button onClick={openCreate} className="text-[#f2ca50] underline">Create one</button></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {albums.map(a => (
            <div key={a.id} className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-[#f2ca50]/30 transition-all group">
              {/* Cover */}
              <div className="aspect-square relative overflow-hidden bg-[#0c1321]">
                {a.cover_url
                  ? <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-5xl text-[#d0c5af]/20">album</span></div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1321]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(a.status)}`}>{a.status}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-1">
                <p className="font-bold text-sm text-[#dce2f6] truncate group-hover:text-[#f2ca50] transition-colors">{a.title}</p>
                <p className="text-xs text-[#d0c5af]/60 truncate">{a.artist}</p>
                {a.description && <p className="text-[11px] text-[#d0c5af]/40 line-clamp-2 mt-1">{a.description}</p>}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-[#d0c5af]/40">{a.track_count ?? 0} tracks</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(a)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af]/50 transition-all">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(a)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af]/50 transition-all">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden">

            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">{editAlbum ? 'Edit Album' : 'Create Album'}</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Cover upload */}
              <div>
                <label className={labelCls}>Album Cover</label>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCoverChange(e.target.files[0])} />
                <div
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleCoverChange(f); }}
                  className="relative w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-[#f2ca50]/40 bg-[#0c1321] cursor-pointer overflow-hidden flex items-center justify-center transition-all group"
                >
                  {coverPreview
                    ? <img src={coverPreview} className="w-full h-full object-cover" alt="cover" />
                    : <div className="flex flex-col items-center gap-2 text-[#d0c5af]/40 group-hover:text-[#f2ca50]/60 transition-colors">
                        <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                        <p className="text-xs">Click or drag & drop cover image</p>
                      </div>
                  }
                  {coverPreview && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white font-semibold">Change Cover</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelCls}>Album Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Mantras" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Artist <span className="text-[#d0c5af]/30 font-normal">(optional)</span></label>
                <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="e.g. Vedic Chanting Group" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Description <span className="text-[#d0c5af]/30 font-normal">(optional)</span></label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this album..." className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as Album['status'])} className={inputCls}>
                  <option value="Draft">Draft</option>
                  <option value="Premium">Premium</option>
                  <option value="Public">Public</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50">
                {(saving || uploading) && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {uploading ? 'Uploading...' : saving ? 'Saving...' : editAlbum ? 'Update Album' : 'Create Album'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-[#19202e] border border-rose-500/20 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-rose-400 text-2xl">delete_forever</span>
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6]">Delete Album?</h4>
              <p className="text-xs text-[#d0c5af]/60">"<span className="text-[#dce2f6] font-semibold">{deleteTarget.title}</span>" and all its data will be removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadAudioToR2 } from '../services/r2Client';

interface Album { id: string; title: string; artist: string; cover_url: string; }
interface Track {
  id: string;
  title: string;
  artist: string;
  album_id: string;
  language: string;
  duration: string;
  is_premium: boolean;
  audio_url: string;
  status: 'Active' | 'Draft';
  created_at: string;
}

const inputCls = 'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none transition-all';
const labelCls = 'text-[10px] font-semibold text-[#f2ca50] block mb-1.5';

export const AudioLibraryView: React.FC = () => {
  const [albums,          setAlbums]          = useState<Album[]>([]);
  const [tracks,          setTracks]          = useState<Track[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTrack,    setEditTrack]    = useState<Track | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // Form
  const [title,      setTitle]      = useState('');
  const [artist,     setArtist]     = useState('');
  const [albumId,    setAlbumId]    = useState('');
  const [language,   setLanguage]   = useState('Sanskrit');
  const [isPremium,  setIsPremium]  = useState(false);
  const [status,     setStatus]     = useState<Track['status']>('Active');
  const [audioFile,  setAudioFile]  = useState<File | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: albs }, { data: trks }] = await Promise.all([
      supabase.from('albums').select('id,title,artist,cover_url').order('created_at', { ascending: false }),
      supabase.from('audio_tracks').select('*').order('created_at', { ascending: false }),
    ]);
    const albumList = (albs as Album[]) || [];
    setAlbums(albumList);
    setTracks((trks as Track[]) || []);
    if (albumList.length > 0 && !selectedAlbumId) setSelectedAlbumId(albumList[0].id);
    setLoading(false);
  };

  const filteredTracks = tracks.filter(t => t.album_id === selectedAlbumId);
  const selectedAlbum  = albums.find(a => a.id === selectedAlbumId);

  const openAdd = () => {
    setEditTrack(null);
    setTitle(''); setArtist(''); setAlbumId(selectedAlbumId || albums[0]?.id || '');
    setLanguage('Sanskrit'); setIsPremium(false); setStatus('Active');
    setAudioFile(null); setUploadPct(0);
    setModalOpen(true);
  };

  const openEdit = (t: Track) => {
    setEditTrack(t);
    setTitle(t.title); setArtist(t.artist); setAlbumId(t.album_id);
    setLanguage(t.language); setIsPremium(t.is_premium); setStatus(t.status);
    setAudioFile(null); setUploadPct(0);
    setModalOpen(true);
  };

  const handleAudioFile = (file: File) => {
    if (!file.type.startsWith('audio/')) { showToast('Please select an audio file', 'error'); return; }
    setAudioFile(file);
  };

  // Fake progress bar during upload
  const fakeProgress = () => {
    setUploadPct(0);
    const iv = setInterval(() => setUploadPct(p => { if (p >= 90) { clearInterval(iv); return 90; } return p + 10; }), 200);
    return iv;
  };

  const handleSave = async () => {
    if (!title.trim() || !albumId) { showToast('Title and album are required', 'error'); return; }
    if (!editTrack && !audioFile) { showToast('Please upload an audio file', 'error'); return; }

    setSaving(true);
    let audio_url = editTrack?.audio_url || '';

    if (audioFile) {
      setUploading(true);
      const iv = fakeProgress();
      try {
        audio_url = await uploadAudioToR2(audioFile);
        clearInterval(iv); setUploadPct(100);
      } catch (e: any) {
        clearInterval(iv);
        showToast('Audio upload failed: ' + e.message, 'error');
        setSaving(false); setUploading(false); return;
      }
      setUploading(false);
    }

    // Parse duration from audio file if available
    let duration = editTrack?.duration || '0:00';
    if (audioFile) {
      try {
        duration = await new Promise<string>(res => {
          const a = document.createElement('audio');
          a.src = URL.createObjectURL(audioFile);
          a.onloadedmetadata = () => {
            const s = Math.floor(a.duration);
            res(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
          };
          a.onerror = () => res('0:00');
        });
      } catch { /* keep default */ }
    }

    const payload = { title: title.trim(), artist: artist.trim() || null, album_id: albumId, language, is_premium: isPremium, status, audio_url, duration };
    const { error } = editTrack
      ? await supabase.from('audio_tracks').update(payload).eq('id', editTrack.id)
      : await supabase.from('audio_tracks').insert(payload);

    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editTrack ? 'Track updated!' : 'Track added!');
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('audio_tracks').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Track deleted');
    setDeleteTarget(null);
    fetchAll();
  };

  const handleTogglePremium = async (t: Track) => {
    await supabase.from('audio_tracks').update({ is_premium: !t.is_premium }).eq('id', t.id);
    fetchAll();
  };

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
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Audio Library</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            <span className="text-[#f2ca50] font-semibold">{tracks.length}</span> tracks across <span className="text-[#f2ca50] font-semibold">{albums.length}</span> albums
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[#f2ca50]/10">
          <span className="material-symbols-outlined text-base">add</span>Add Track
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
        </div>
      ) : (
        <>
          {/* Album tabs */}
          {albums.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {albums.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAlbumId(a.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${selectedAlbumId === a.id ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-[#19202e] border border-white/10 text-[#d0c5af]/70 hover:border-[#f2ca50]/30'}`}
                >
                  {a.cover_url && <img src={a.cover_url} className="w-5 h-5 rounded object-cover" alt="" />}
                  {a.title}
                </button>
              ))}
            </div>
          )}

          {/* Tracks table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#dce2f6]">{selectedAlbum?.title || 'All Tracks'}</p>
                <p className="text-xs text-[#d0c5af]/50 mt-0.5">{filteredTracks.length} tracks</p>
              </div>
            </div>

            {filteredTracks.length === 0 ? (
              <div className="py-20 text-center text-[#d0c5af]/40 text-sm">
                No tracks in this album yet.{' '}
                <button onClick={openAdd} className="text-[#f2ca50] underline">Add one</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#19202e] border-b-2 border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Artist</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Premium</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Audio</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTracks.map((t, i) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 px-4 text-[11px] text-[#d0c5af]/30 font-mono">{i + 1}</td>
                        <td className="py-3 px-4 max-w-[160px]">
                          <p className="text-xs font-semibold text-[#dce2f6] truncate group-hover:text-[#f2ca50] transition-colors">{t.title}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#d0c5af]/60 max-w-[120px] truncate">{t.artist}</td>
                        <td className="py-3 px-4 text-xs text-[#d0c5af]/60">{t.language}</td>
                        <td className="py-3 px-4 text-xs text-[#d0c5af]/60 font-mono">{t.duration}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleTogglePremium(t)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:brightness-125
                              ${t.is_premium ? 'bg-[#f2ca50]/10 text-[#f2ca50] border-[#f2ca50]/20' : 'bg-white/5 text-[#d0c5af]/40 border-white/10'}`}
                          >
                            {t.is_premium ? '★ Premium' : 'Free'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border
                            ${t.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-[#d0c5af]/40 border-white/10'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.audio_url
                            ? <audio controls src={t.audio_url} className="h-7 w-36 opacity-70 hover:opacity-100 transition-opacity" />
                            : <span className="text-[10px] text-[#d0c5af]/30">—</span>
                          }
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af]/50 transition-all">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => setDeleteTarget(t)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af]/50 transition-all">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
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
        </>
      )}

      {/* Add / Edit Track Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#19202e] border border-[#f2ca50]/20 rounded-3xl shadow-2xl overflow-hidden">

            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">{editTrack ? 'Edit Track' : 'Add Audio Track'}</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#d0c5af]/60 hover:text-white hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Title */}
              <div>
                <label className={labelCls}>Track Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mahamrityunjaya Mantra" className={inputCls} />
              </div>

              {/* Artist */}
              <div>
                <label className={labelCls}>Artist <span className="text-[#d0c5af]/30 font-normal">(optional)</span></label>
                <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="e.g. Traditional Chants" className={inputCls} />
              </div>

              {/* Album dropdown */}
              <div>
                <label className={labelCls}>Album *</label>
                {albums.length === 0 ? (
                  <p className="text-xs text-rose-400/80 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">
                    No albums found. <span className="font-semibold">Create an album first</span> from the Albums section.
                  </p>
                ) : (
                  <select value={albumId} onChange={e => setAlbumId(e.target.value)} className={inputCls}>
                    <option value="">— Select Album —</option>
                    {albums.map(a => (
                      <option key={a.id} value={a.id}>{a.title} — {a.artist}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Language</label>
                  <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="Sanskrit" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as Track['status'])} className={inputCls}>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Premium toggle */}
              <label className="flex items-center gap-3 cursor-pointer bg-[#0c1321] rounded-xl px-3 py-3 border border-white/10">
                <div onClick={() => setIsPremium(p => !p)} className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${isPremium ? 'bg-[#f2ca50]' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPremium ? 'left-5' : 'left-0.5'}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#dce2f6]">Premium Only</p>
                  <p className="text-[10px] text-[#d0c5af]/40">Restrict to premium subscribers</p>
                </div>
              </label>

              {/* Audio file upload — drag & drop */}
              <div>
                <label className={labelCls}>{editTrack ? 'Replace Audio File' : 'Audio File *'}</label>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => e.target.files?.[0] && handleAudioFile(e.target.files[0])} />
                <div
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleAudioFile(f); }}
                  className={`w-full rounded-xl border-2 border-dashed cursor-pointer transition-all p-5 flex flex-col items-center gap-2 text-center
                    ${dragOver ? 'border-[#f2ca50] bg-[#f2ca50]/5' : audioFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-[#0c1321] hover:border-[#f2ca50]/30'}`}
                >
                  <span className={`material-symbols-outlined text-3xl ${audioFile ? 'text-emerald-400' : 'text-[#d0c5af]/30'}`}>
                    {audioFile ? 'audio_file' : 'upload_file'}
                  </span>
                  {audioFile ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400">{audioFile.name}</p>
                      <p className="text-[10px] text-[#d0c5af]/40 mt-0.5">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-[#d0c5af]/60">Drag & drop audio file here</p>
                      <p className="text-[10px] text-[#d0c5af]/30 mt-0.5">MP3, WAV, FLAC, M4A supported</p>
                    </div>
                  )}
                </div>

                {/* Upload progress */}
                {uploading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#d0c5af]/50">
                      <span>Uploading to Cloudflare R2...</span>
                      <span>{uploadPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#f2ca50] rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Existing audio preview when editing */}
                {editTrack?.audio_url && !audioFile && (
                  <div className="mt-2 flex items-center gap-2 bg-[#0c1321] rounded-xl px-3 py-2 border border-white/10">
                    <span className="material-symbols-outlined text-[#f2ca50] text-sm">audio_file</span>
                    <p className="text-[10px] text-[#d0c5af]/60 truncate flex-1">Current: {editTrack.audio_url.split('/').pop()}</p>
                    <audio controls src={editTrack.audio_url} className="h-6 w-28" />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50">
                {(saving || uploading) && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {uploading ? 'Uploading...' : saving ? 'Saving...' : editTrack ? 'Update Track' : 'Add Track'}
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
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6]">Delete Track?</h4>
              <p className="text-xs text-[#d0c5af]/60">"<span className="text-[#dce2f6] font-semibold">{deleteTarget.title}</span>" will be permanently removed.</p>
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

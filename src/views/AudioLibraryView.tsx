import React, { useState } from 'react';
import { Album, AudioTrack } from '../types';

interface AudioLibraryViewProps {
  albums: Album[];
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack) => void;
  onToggleTrackPremium: (trackId: string, currentVal: boolean) => void;
  onCreateAlbum: (newAlbum: Partial<Album>) => void;
  onAddTrackToAlbum: (track: Partial<AudioTrack>) => void;
}

export const AudioLibraryView: React.FC<AudioLibraryViewProps> = ({
  albums,
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleTrackPremium,
  onCreateAlbum,
  onAddTrackToAlbum,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('alb-1');
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);

  // New Album Form State
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [albumStatus, setAlbumStatus] = useState<'Premium' | 'Public' | 'Draft'>('Premium');

  // New Track Form State
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackLanguage, setTrackLanguage] = useState('Sanskrit');
  const [trackDuration, setTrackDuration] = useState('10:00');
  const [trackIsPremium, setTrackIsPremium] = useState(true);

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId) || albums[0];
  const selectedAlbumTracks = tracks.filter(
    (t) => t.albumId === selectedAlbumId || !t.albumId
  );

  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle || !albumArtist) return;

    onCreateAlbum({
      title: albumTitle,
      artist: albumArtist,
      description: 'Newly initialized sacred collection for seekers.',
      releaseYear: 2026,
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCaQYZkd6b0uA0xMqmiHFm6FREXQtBtj1Ri3fGVrr_74BczZpMUkqDNEAXpHrAlxR4bDc68KnqEvQLR2ngJQhI7-2Abhzt_38glWa8i1F-a2yx14c8Lg3WnAIq33qDVRkEGPe9HbHPoYPf9D7Nnfq65olSRkiXTCr-zLP_hEp4FBL-s5X7enXj5j3cBO2q6DWLqk6XurDE6b0966qtRKpzopHCylT_-Q6YUuzRlZnvxfRXHVN6_Dbw0SA',
      tag: 'New Release',
      trackCount: 0,
      totalDuration: '0h 0m',
      status: albumStatus,
    });

    setShowCreateAlbumModal(false);
    setAlbumTitle('');
    setAlbumArtist('');
  };

  const handleAddTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle || !trackArtist) return;

    onAddTrackToAlbum({
      title: trackTitle,
      artist: trackArtist,
      category: 'Chant',
      language: trackLanguage,
      duration: trackDuration,
      durationSeconds: 600,
      isPremium: trackIsPremium,
      status: 'Active',
      albumId: selectedAlbumId,
    });

    setShowAddTrackModal(false);
    setTrackTitle('');
    setTrackArtist('');
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#f2ca50] mb-2">
            Audio Library
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 max-w-2xl leading-relaxed">
            Curate the sacred vibrations. Manage your Vedic chants, bhajans, and meditation scores
            with divine precision.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateAlbumModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f2ca50] text-[#3c2f00] font-bold text-sm shadow-lg sacred-glow hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Create Album
          </button>
        </div>
      </div>

      {/* Bento Grid Layout for Albums */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Featured Album (Spans 2 Columns) */}
        {albums[0] && (
          <div
            onClick={() => setSelectedAlbumId(albums[0].id)}
            className={`md:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer relative border-2 transition-all ${
              selectedAlbumId === albums[0].id ? 'border-[#f2ca50]' : 'border-white/10'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1321] via-transparent to-transparent opacity-90 z-10" />
            <div className="h-64 relative overflow-hidden">
              <div
                className="absolute inset-0 scale-105 group-hover:scale-100 transition-transform duration-700 bg-cover bg-center"
                style={{ backgroundImage: `url('${albums[0].coverUrl}')` }}
              />
            </div>
            <div className="absolute bottom-0 left-0 p-6 md:p-8 z-20 w-full">
              <span className="bg-[#d4af37] text-[#554300] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 inline-block shadow-sm">
                {albums[0].tag || 'Trending Now'}
              </span>
              <h3 className="font-serif-headline text-2xl md:text-3xl text-[#dce2f6] mb-2 font-bold">
                {albums[0].title}
              </h3>
              <p className="text-xs md:text-sm text-[#d0c5af]/80 mb-4 line-clamp-2">
                {albums[0].description}
              </p>
              <div className="flex items-center gap-6 text-xs text-[#d0c5af]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">music_note</span>
                  <span>{albums[0].trackCount} Tracks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>{albums[0].totalDuration}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Album Cards */}
        {albums.slice(1).map((alb) => (
          <div
            key={alb.id}
            onClick={() => setSelectedAlbumId(alb.id)}
            className={`glass-card rounded-2xl p-4 flex flex-col group cursor-pointer border-2 transition-all ${
              selectedAlbumId === alb.id ? 'border-[#f2ca50]' : 'border-white/10'
            }`}
          >
            <div className="aspect-square rounded-xl mb-4 overflow-hidden relative">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url('${alb.coverUrl}')` }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="w-12 h-12 rounded-full bg-[#f2ca50] flex items-center justify-center text-[#3c2f00] shadow-lg font-bold">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </div>
              </div>
            </div>
            <h4 className="font-serif-headline text-lg text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors font-semibold truncate">
              {alb.title}
            </h4>
            <p className="text-xs text-[#d0c5af]/80 truncate">
              {alb.artist} • {alb.releaseYear}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span
                className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                  alb.status === 'Premium'
                    ? 'border-[#f2ca50]/30 text-[#f2ca50] bg-[#f2ca50]/10'
                    : 'border-white/10 text-[#d0c5af] bg-white/5'
                }`}
              >
                {alb.status}
              </span>
              <button className="text-[#d0c5af] hover:text-[#f2ca50]">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Song List Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border-t-2 border-[#f2ca50]/30">
        <div className="p-6 md:p-8 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif-headline text-xl md:text-2xl text-[#dce2f6] font-semibold">
              {selectedAlbum.title} — Tracklist
            </h3>
            <p className="text-xs md:text-sm text-[#d0c5af]/80 mt-1">
              {selectedAlbumTracks.length} Items • Total Duration {selectedAlbum.totalDuration}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => alert('Bulk edit active for selected album tracks.')}
              className="px-4 py-2 bg-white/5 rounded-xl font-semibold text-xs text-[#dce2f6] hover:bg-white/10 transition-colors border border-white/10"
            >
              Bulk Actions
            </button>
            <button
              onClick={() => setShowAddTrackModal(true)}
              className="px-4 py-2 bg-[#f2ca50] text-[#3c2f00] rounded-xl font-bold text-xs hover:brightness-110 transition-colors shadow-md"
            >
              Add Track
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#232a39] border-b border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Title / Artist</th>
                <th className="px-6 py-4">Language</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Premium Only</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {selectedAlbumTracks.map((trk, idx) => {
                const isCurrentPlaying = currentTrack?.id === trk.id && isPlaying;
                return (
                  <tr
                    key={trk.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-[#d0c5af]">
                      {(idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => onPlayTrack(trk)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            isCurrentPlaying
                              ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow-md gold-glow'
                              : 'bg-[#f2ca50]/10 text-[#f2ca50] group-hover:bg-[#f2ca50] group-hover:text-[#3c2f00]'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {isCurrentPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                        <div>
                          <p className="font-semibold text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors">
                            {trk.title}
                          </p>
                          <p className="text-xs text-[#d0c5af]/70">{trk.artist}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#d0c5af]">{trk.language}</td>
                    <td className="px-6 py-4 text-xs text-[#d0c5af] font-mono">{trk.duration}</td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trk.isPremium}
                          onChange={() => onToggleTrackPremium(trk.id, trk.isPremium)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f2ca50]" />
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onPlayTrack(trk)}
                        className="text-[#d0c5af] hover:text-[#f2ca50] p-1"
                        title="Listen"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Album Modal ("New Sacred Collection") */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-xl rounded-2xl p-6 md:p-8 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-2xl text-[#f2ca50] font-bold">
                New Sacred Collection
              </h3>
              <button
                onClick={() => setShowCreateAlbumModal(false)}
                className="text-[#d0c5af] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAlbumSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#dce2f6] mb-1">
                    Album Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Mantras"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-3 text-sm text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#dce2f6] mb-1">
                    Primary Artist
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Artist / Ensemble"
                    value={albumArtist}
                    onChange={(e) => setAlbumArtist(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-3 text-sm text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#dce2f6] mb-2">
                  Artwork & Audio Files
                </label>
                <div className="border-2 border-dashed border-white/15 rounded-xl p-8 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group">
                  <span className="material-symbols-outlined text-4xl text-[#d0c5af]/40 group-hover:text-[#f2ca50] transition-colors mb-2">
                    cloud_upload
                  </span>
                  <p className="text-sm font-medium text-[#dce2f6]">
                    Drag and drop artwork or audio files
                  </p>
                  <p className="text-xs text-[#d0c5af]/60 mt-1">
                    PNG, JPG, MP3, FLAC (Max 500MB)
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#dce2f6] mb-1">
                    Release Status
                  </label>
                  <select
                    value={albumStatus}
                    onChange={(e) => setAlbumStatus(e.target.value as any)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-3 text-sm text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Premium">Premium Only</option>
                    <option value="Public">Public Release</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-[#f2ca50] text-[#3c2f00] px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Initialize Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Track Modal */}
      {showAddTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                Add Track to {selectedAlbum.title}
              </h3>
              <button
                onClick={() => setShowAddTrackModal(false)}
                className="text-[#d0c5af] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTrackSubmit} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#dce2f6] font-medium mb-1">Track Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahamrityunjaya Mantra"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#dce2f6] font-medium mb-1">Artist</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Chants"
                  value={trackArtist}
                  onChange={(e) => setTrackArtist(e.target.value)}
                  className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#dce2f6] font-medium mb-1">Language</label>
                  <input
                    type="text"
                    value={trackLanguage}
                    onChange={(e) => setTrackLanguage(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#dce2f6] font-medium mb-1">Duration</label>
                  <input
                    type="text"
                    value={trackDuration}
                    onChange={(e) => setTrackDuration(e.target.value)}
                    className="w-full bg-[#19202e] border border-white/20 rounded-lg p-2.5 text-[#dce2f6] focus:border-[#f2ca50] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#dce2f6]">
                  <input
                    type="checkbox"
                    checked={trackIsPremium}
                    onChange={(e) => setTrackIsPremium(e.target.checked)}
                    className="rounded bg-[#19202e] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                  <span>Premium Only</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddTrackModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-[#d0c5af] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#f2ca50] text-[#3c2f00] font-bold hover:brightness-110 shadow-md"
                >
                  Add Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

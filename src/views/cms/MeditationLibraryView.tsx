import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { MeditationLibraryItem, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';

export const MeditationLibraryView: React.FC = () => {
  const [tracks, setTracks] = useState<MeditationLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<MeditationLibraryItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setIsLoading(true);
    const data = await cmsService.meditations.getAll();
    setTracks(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      title: 'Solfeggio 528Hz Sacred DNA Healing Drone',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      coverImage: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=400',
      duration: '45 mins',
      tags: ['528Hz', 'DNA Repair', 'Solfeggio', 'Chakra'],
      binauralFrequencyHz: '528Hz Theta',
      ambientNoiseType: 'Cosmic Temple Bell',
      status: 'Published',
      playsCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MeditationLibraryItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: MeditationLibraryItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: MeditationLibraryItem) => {
    await cmsService.meditations.create({
      ...item,
      title: `${item.title} (Copy)`,
    });
    loadTracks();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.meditations.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.meditations.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadTracks();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.meditations.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.meditations.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadTracks();
  };

  const columns: Column<MeditationLibraryItem>[] = [
    {
      key: 'title',
      header: 'Meditation Sound Track',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-10 h-10 rounded-xl object-cover border border-white/10"
          />
          <div>
            <p className="font-semibold text-[#dce2f6] text-sm">{item.title}</p>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[200px]">
              {item.tags?.join(' • ')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'binauralFrequencyHz',
      header: 'Binaural Frequency',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-mono font-bold">
          🎧 {item.binauralFrequencyHz || 'None'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (item) => <span className="text-xs text-[#d0c5af]">{item.duration}</span>,
    },
    {
      key: 'playsCount',
      header: 'Total Plays',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-bold text-emerald-400">
          {item.playsCount?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (item) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            item.status === 'Published'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Published', value: 'Published' },
        { label: 'Draft', value: 'Draft' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Library Tracks</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{tracks.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Audio Plays</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">112,000</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Solfeggio Frequencies</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">432Hz & 528Hz</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Avg Duration</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">35 Mins</h3>
        </div>
      </div>

      <DataTable
        title="Meditation Audio Library CMS"
        description="Organize ambient soundscapes, Binaural Theta beat drones, Solfeggio frequencies, and singing bowls."
        data={tracks}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['title', 'binauralFrequencyHz', 'ambientNoiseType']}
        searchPlaceholder="Search 432Hz, Solfeggio, singing bowl..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Sound Track"
        onView={handleOpenView}
        onEdit={handleOpenEdit}
        onDuplicate={handleDuplicate}
        onDelete={(item) => setDeleteTargetId(item.id)}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
      />

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-xl font-bold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined">library_music</span>
                {modalMode === 'create'
                  ? 'Add Sound Track'
                  : modalMode === 'edit'
                  ? 'Edit Track'
                  : 'Track Details'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <img
                    src={selectedItem.coverImage}
                    alt="Cover"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.title}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">Frequency: {selectedItem.binauralFrequencyHz}</p>
                  </div>
                </div>

                {selectedItem.audioUrl && (
                  <div className="p-3 bg-[#0c1321] rounded-xl border border-white/10">
                    <p className="text-[#f2ca50] font-semibold mb-2">Track Preview</p>
                    <audio controls src={selectedItem.audioUrl} className="w-full h-10" />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Track Title</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.title || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Binaural Frequency</label>
                    <input
                      type="text"
                      value={selectedItem.binauralFrequencyHz || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, binauralFrequencyHz: e.target.value })}
                      placeholder="e.g. 432Hz Alpha, 528Hz Theta"
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Ambient Sound Type</label>
                    <input
                      type="text"
                      value={selectedItem.ambientNoiseType || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, ambientNoiseType: e.target.value })}
                      placeholder="e.g. Temple Bell, Rain, Tanpura"
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Duration</label>
                    <input
                      type="text"
                      value={selectedItem.duration || '30 mins'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, duration: e.target.value })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>
                </div>

                <MediaUploader
                  label="Track Cover Art"
                  type="Image"
                  value={selectedItem.coverImage}
                  onChange={(url) => setSelectedItem({ ...selectedItem, coverImage: url })}
                />

                <MediaUploader
                  label="Audio File (HQ MP3/FLAC)"
                  type="Audio"
                  value={selectedItem.audioUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, audioUrl: url })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#232a39] text-[#dce2f6] rounded-xl font-semibold hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#f2ca50] text-[#3c2f00] font-bold rounded-xl hover:bg-[#ffe082]"
                  >
                    Save Sound Track
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this track from the meditation library?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { GuidedSessionItem, DifficultyLevel, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';

export const GuidedSessionsView: React.FC = () => {
  const [sessions, setSessions] = useState<GuidedSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<GuidedSessionItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    const data = await cmsService.sessions.getAll();
    setSessions(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      title: 'Deep Pranayama Diaphragmatic Awakening',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400',
      description: 'Guided breathwork expanding lung capacity and vital prana flow.',
      duration: '15 mins',
      category: 'Breathing',
      difficulty: 'Beginner',
      instructor: 'Swami Anandadeva',
      language: 'English',
      status: 'Published',
      listensCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: GuidedSessionItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: GuidedSessionItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: GuidedSessionItem) => {
    await cmsService.sessions.create({
      ...item,
      title: `${item.title} (Copy)`,
    });
    loadSessions();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.sessions.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.sessions.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadSessions();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.sessions.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.sessions.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadSessions();
  };

  const columns: Column<GuidedSessionItem>[] = [
    {
      key: 'title',
      header: 'Guided Session',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-10 h-10 rounded-xl object-cover border border-white/10"
          />
          <div>
            <p className="font-semibold text-[#dce2f6] text-sm">{item.title}</p>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[200px]">
              By {item.instructor} • {item.language}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-semibold">
          {item.category}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (item) => <span className="text-xs text-[#d0c5af]">{item.duration}</span>,
    },
    {
      key: 'listensCount',
      header: 'Listens',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-bold text-emerald-400">
          {item.listensCount?.toLocaleString()}
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
      key: 'category',
      label: 'Category',
      options: [
        { label: 'Meditation', value: 'Meditation' },
        { label: 'Breathing', value: 'Breathing' },
        { label: 'Yoga', value: 'Yoga' },
        { label: 'Prayer', value: 'Prayer' },
        { label: 'Relaxation', value: 'Relaxation' },
        { label: 'Sleep', value: 'Sleep' },
        { label: 'Visualization', value: 'Visualization' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Guided Sessions</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{sessions.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Listens</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">83,500</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Instructors</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">12 Vedic Gurus</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Most Popular</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">Yoga Nidra</h3>
        </div>
      </div>

      <DataTable
        title="Guided Sessions CMS"
        description="Manage instructor-led sessions across Meditation, Breathing, Yoga, Prayer, Relaxation, Sleep, and Visualization."
        data={sessions}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['title', 'description', 'instructor']}
        searchPlaceholder="Search Yoga Nidra, Swami, breathing..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Session"
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
                <span className="material-symbols-outlined">spatial_audio</span>
                {modalMode === 'create'
                  ? 'Add Guided Session'
                  : modalMode === 'edit'
                  ? 'Edit Session'
                  : 'Session Overview'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <img
                    src={selectedItem.imageUrl}
                    alt="Cover"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.title}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                    <p className="text-emerald-400 font-bold mt-1">
                      Instructor: {selectedItem.instructor} • Duration: {selectedItem.duration}
                    </p>
                  </div>
                </div>

                {selectedItem.audioUrl && (
                  <div className="p-3 bg-[#0c1321] rounded-xl border border-white/10">
                    <p className="text-[#f2ca50] font-semibold mb-2">Play Audio Session</p>
                    <audio controls src={selectedItem.audioUrl} className="w-full h-10" />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Session Title</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.title || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={selectedItem.description || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Category</label>
                    <select
                      value={selectedItem.category || 'Meditation'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value as any })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      {['Meditation', 'Breathing', 'Yoga', 'Prayer', 'Relaxation', 'Sleep', 'Visualization'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Instructor</label>
                    <input
                      type="text"
                      value={selectedItem.instructor || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, instructor: e.target.value })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Duration</label>
                    <input
                      type="text"
                      value={selectedItem.duration || '20 mins'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, duration: e.target.value })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>
                </div>

                <MediaUploader
                  label="Session Image Banner"
                  type="Image"
                  value={selectedItem.imageUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, imageUrl: url })}
                />

                <MediaUploader
                  label="Session Audio File"
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
                    Save Session
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this guided session?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { HealingContentItem, EmotionType, ContentMediaType, DifficultyLevel, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';

export const HealingContentView: React.FC = () => {
  const [healingItems, setHealingItems] = useState<HealingContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<HealingContentItem>>({});

  // Deletions
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    const data = await cmsService.healing.getAll();
    setHealingItems(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      title: 'So Hum Mantra Meditation for Deep Mind Reset',
      description: 'Breathing frequency soundscape designed for mental calm.',
      emotionCategory: 'Stress',
      contentType: 'Audio',
      mediaUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=400',
      duration: '15 mins',
      durationSeconds: 900,
      difficulty: 'Beginner',
      isPremium: true,
      isFeatured: true,
      language: 'Sanskrit',
      status: 'Published',
      publishDate: new Date().toISOString().split('T')[0],
      viewsCount: 0,
      completionRate: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: HealingContentItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: HealingContentItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: HealingContentItem) => {
    await cmsService.healing.create({
      ...item,
      title: `${item.title} (Copy)`,
    });
    loadContent();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.healing.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.healing.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadContent();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.healing.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.healing.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadContent();
  };

  const columns: Column<HealingContentItem>[] = [
    {
      key: 'title',
      header: 'Content',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-10 h-10 rounded-xl object-cover border border-white/10"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#dce2f6] text-sm">{item.title}</p>
              {item.isPremium && (
                <span className="px-1.5 py-0.5 bg-[#f2ca50]/20 text-[#f2ca50] font-bold text-[9px] rounded uppercase">
                  Premium
                </span>
              )}
              {item.isFeatured && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[9px] rounded uppercase">
                  Featured
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[220px]">
              {item.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'emotionCategory',
      header: 'Emotion',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] rounded-lg border border-white/10 text-xs font-semibold text-[#f2ca50]">
          {item.emotionCategory}
        </span>
      ),
    },
    {
      key: 'contentType',
      header: 'Type',
      sortable: true,
      accessor: (item) => (
        <span className="px-2 py-0.5 bg-[#232a39] text-[#dce2f6] rounded text-[11px]">
          {item.contentType}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (item) => <span className="text-xs text-[#d0c5af]/80">{item.duration}</span>,
    },
    {
      key: 'analytics',
      header: 'Analytics',
      accessor: (item) => (
        <div className="text-[10px] space-y-0.5">
          <p className="text-[#f2ca50] font-semibold">{item.viewsCount.toLocaleString()} Views</p>
          <p className="text-emerald-400 font-bold">{item.completionRate}% Completion</p>
        </div>
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
      key: 'contentType',
      label: 'Content Type',
      options: [
        { label: 'Audio', value: 'Audio' },
        { label: 'Scripture', value: 'Scripture' },
        { label: 'Practice', value: 'Practice' },
        { label: 'Meditation', value: 'Meditation' },
      ],
    },
    {
      key: 'emotionCategory',
      label: 'Emotion Category',
      options: [
        { label: 'Stress', value: 'Stress' },
        { label: 'Anxiety', value: 'Anxiety' },
        { label: 'Fear', value: 'Fear' },
        { label: 'Anger', value: 'Anger' },
        { label: 'Peace', value: 'Peace' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Healing Items</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{healingItems.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Avg. Completion</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">88.5%</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Plays/Views</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">41,800</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Premium Content</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">
            {healingItems.filter((i) => i.isPremium).length} Items
          </h3>
        </div>
      </div>

      <DataTable
        title="Healing Content CMS"
        description="Curate therapeutic audio, scriptures, practices, and meditations matched to seekers' emotions."
        data={healingItems}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['title', 'description', 'emotionCategory']}
        searchPlaceholder="Search healing title, stress, audio..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Healing Content"
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
                <span className="material-symbols-outlined">healing</span>
                {modalMode === 'create'
                  ? 'Add Healing Content'
                  : modalMode === 'edit'
                  ? 'Edit Healing Content'
                  : 'Healing Content Details'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <img
                    src={selectedItem.thumbnailUrl}
                    alt="Cover"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.title}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                    <p className="text-[11px] text-emerald-400 font-bold mt-1">
                      {selectedItem.viewsCount} Views • {selectedItem.completionRate}% Completion Rate
                    </p>
                  </div>
                </div>

                {selectedItem.contentType === 'Audio' && selectedItem.mediaUrl && (
                  <div className="p-3 bg-[#0c1321] rounded-xl border border-white/10">
                    <p className="text-[#f2ca50] font-semibold mb-2">Audio Preview</p>
                    <audio controls src={selectedItem.mediaUrl} className="w-full h-10" />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Title</label>
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
                    <label className="text-[#f2ca50] font-semibold block mb-1">Emotion Category</label>
                    <select
                      value={selectedItem.emotionCategory || 'Stress'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, emotionCategory: e.target.value as EmotionType })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      {['Stress', 'Anxiety', 'Fear', 'Anger', 'Peace', 'Gratitude', 'Confidence', 'Loneliness'].map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Content Type</label>
                    <select
                      value={selectedItem.contentType || 'Audio'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, contentType: e.target.value as ContentMediaType })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      {['Audio', 'Image', 'Video', 'Scripture', 'Practice', 'Meditation'].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Difficulty</label>
                    <select
                      value={selectedItem.difficulty || 'Beginner'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, difficulty: e.target.value as DifficultyLevel })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <MediaUploader
                  label="Thumbnail Image Asset"
                  type="Image"
                  value={selectedItem.thumbnailUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, thumbnailUrl: url })}
                />

                <MediaUploader
                  label="Media Content File (Audio/Video)"
                  type={selectedItem.contentType === 'Video' ? 'Video' : 'Audio'}
                  value={selectedItem.mediaUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, mediaUrl: url })}
                />

                <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#0c1321] rounded-xl border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.isPremium || false}
                      onChange={(e) => setSelectedItem({ ...selectedItem, isPremium: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-[#f2ca50] font-bold">Premium Tier Required</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.isFeatured || false}
                      onChange={(e) => setSelectedItem({ ...selectedItem, isFeatured: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-amber-300 font-bold">Featured On Home Banner</span>
                  </label>
                </div>

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
                    Save Content
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this healing content? Seekers will no longer see this in their app."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { SadhanaPracticeItem, DifficultyLevel, RecommendedTimeOfDay, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';
import { RichTextEditor } from '../../components/common/RichTextEditor';

export const SadhanaPracticesView: React.FC = () => {
  const [practices, setPractices] = useState<SadhanaPracticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<SadhanaPracticeItem>>({});

  // Delete
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadPractices();
  }, []);

  const loadPractices = async () => {
    setIsLoading(true);
    const data = await cmsService.practices.getAll();
    setPractices(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      name: 'Bhramari Pranayama (Humming Bee Breath)',
      category: 'Pranayama',
      duration: '10 mins',
      benefits: ['Instantly calms brain', 'Relieves tension', 'Improves sleep'],
      instructions: 'Inhale deeply. Press thumbs gently on cartilage outside ears. Exhale slowly producing a resonant humming bee sound.',
      difficulty: 'Beginner',
      requiredMaterials: ['Quiet seat'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400',
      recommendedTime: 'Evening',
      recommendedLevel: 'Beginner',
      status: 'Published',
      completionCount: 0,
      images: [],
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SadhanaPracticeItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: SadhanaPracticeItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: SadhanaPracticeItem) => {
    await cmsService.practices.create({
      ...item,
      name: `${item.name} (Copy)`,
    });
    loadPractices();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.practices.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.practices.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadPractices();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.practices.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.practices.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadPractices();
  };

  const columns: Column<SadhanaPracticeItem>[] = [
    {
      key: 'name',
      header: 'Practice',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-10 h-10 rounded-xl object-cover border border-white/10"
          />
          <div>
            <p className="font-semibold text-[#dce2f6] text-sm">{item.name}</p>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[200px]">
              {item.benefits?.join(' • ')}
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
      key: 'recommendedTime',
      header: 'Recommended Time',
      sortable: true,
      accessor: (item) => (
        <span className="px-2 py-0.5 bg-[#232a39] text-[#dce2f6] rounded text-[11px]">
          🌅 {item.recommendedTime}
        </span>
      ),
    },
    {
      key: 'difficulty',
      header: 'Level',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-semibold text-[#d0c5af]/80">{item.difficulty}</span>
      ),
    },
    {
      key: 'completionCount',
      header: 'Completions',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-bold text-emerald-400">
          {item.completionCount?.toLocaleString()}
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
        { label: 'Pranayama', value: 'Pranayama' },
        { label: 'Japa', value: 'Japa' },
        { label: 'Dhyana', value: 'Dhyana' },
        { label: 'Kriya', value: 'Kriya' },
      ],
    },
    {
      key: 'recommendedTime',
      label: 'Time of Day',
      options: [
        { label: 'Morning', value: 'Morning' },
        { label: 'Evening', value: 'Evening' },
        { label: 'Night', value: 'Night' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Practices</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{practices.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Sadhanas Done</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">155,500</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Top Category</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">Pranayama</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Morning Sadhakas</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">82%</h3>
        </div>
      </div>

      <DataTable
        title="Sadhana Practices CMS"
        description="Configure step-by-step spiritual techniques, pranayama, mantra japa, and dhyana instructions."
        data={practices}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['name', 'category', 'instructions']}
        searchPlaceholder="Search Nadi Shodhana, Gayatri, Trataka..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Practice"
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
                <span className="material-symbols-outlined">self_improvement</span>
                {modalMode === 'create'
                  ? 'Add Sadhana Practice'
                  : modalMode === 'edit'
                  ? 'Edit Sadhana Practice'
                  : 'Practice Details'}
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
                      {selectedItem.name}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.category} • {selectedItem.duration}</p>
                    <p className="text-emerald-400 font-bold mt-1">
                      Completions: {selectedItem.completionCount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#0c1321] rounded-xl border border-white/10">
                  <p className="text-[#f2ca50] font-semibold mb-1">Step-by-Step Instructions</p>
                  <p className="text-[#d0c5af] leading-relaxed font-serif whitespace-pre-wrap">
                    {selectedItem.instructions}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Practice Name</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.name || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                    placeholder="e.g. Nadi Shodhana Pranayama"
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Category</label>
                    <select
                      value={selectedItem.category || 'Pranayama'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value as any })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      {['Pranayama', 'Mantra Chanting', 'Japa', 'Dhyana', 'Kriya', 'Pooja'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Recommended Time</label>
                    <select
                      value={selectedItem.recommendedTime || 'Morning'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, recommendedTime: e.target.value as RecommendedTimeOfDay })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                      <option value="Anytime">Anytime</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Difficulty Level</label>
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

                <RichTextEditor
                  label="Step-by-Step Instructions & Technique Guidance"
                  value={selectedItem.instructions || ''}
                  onChange={(val) => setSelectedItem({ ...selectedItem, instructions: val })}
                />

                <MediaUploader
                  label="Thumbnail Image"
                  type="Image"
                  value={selectedItem.thumbnailUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, thumbnailUrl: url })}
                />

                <MediaUploader
                  label="Audio Chanting Guide (Optional)"
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
                    Save Practice
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this practice?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

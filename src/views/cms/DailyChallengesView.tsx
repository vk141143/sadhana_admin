import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { DailyChallengeItem, DifficultyLevel, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const DailyChallengesView: React.FC = () => {
  const [challenges, setChallenges] = useState<DailyChallengeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<DailyChallengeItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setIsLoading(true);
    const data = await cmsService.challenges.getAll();
    setChallenges(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      name: '108 Om Chants for World Peace',
      description: 'Chant Om 108 times at dusk for collective harmony.',
      duration: '1 Day',
      xpReward: 300,
      badgeReward: 'Shanti Duta Badge',
      difficulty: 'Beginner',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      isRecurring: true,
      isFeatured: true,
      status: 'Published',
      participantsCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: DailyChallengeItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: DailyChallengeItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: DailyChallengeItem) => {
    await cmsService.challenges.create({
      ...item,
      name: `${item.name} (Copy)`,
    });
    loadChallenges();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.challenges.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.challenges.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadChallenges();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.challenges.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.challenges.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadChallenges();
  };

  const columns: Column<DailyChallengeItem>[] = [
    {
      key: 'name',
      header: 'Challenge',
      sortable: true,
      accessor: (item) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[#dce2f6] text-sm">{item.name}</p>
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
      ),
    },
    {
      key: 'xpReward',
      header: 'Reward',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-mono font-bold text-[#f2ca50]">
          +{item.xpReward} XP
        </span>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-semibold text-[#d0c5af]">{item.difficulty}</span>
      ),
    },
    {
      key: 'participantsCount',
      header: 'Participants',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-bold text-emerald-400">
          {item.participantsCount?.toLocaleString()} Seekers
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
      key: 'difficulty',
      label: 'Difficulty',
      options: [
        { label: 'Beginner', value: 'Beginner' },
        { label: 'Intermediate', value: 'Intermediate' },
        { label: 'Advanced', value: 'Advanced' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Active Challenges</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{challenges.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Daily Participants</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">44,000</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Completion Rate</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">91%</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Recurring Challenges</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">
            {challenges.filter((c) => c.isRecurring).length}
          </h3>
        </div>
      </div>

      <DataTable
        title="Daily Challenges CMS"
        description="Schedule daily & recurring spiritual tasks with badge rewards and XP incentives."
        data={challenges}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['name', 'description']}
        searchPlaceholder="Search sunrise, mahamrityunjaya..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Challenge"
        onView={handleOpenView}
        onEdit={handleOpenEdit}
        onDuplicate={handleDuplicate}
        onDelete={(item) => setDeleteTargetId(item.id)}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
      />

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-xl font-bold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined">today</span>
                {modalMode === 'create'
                  ? 'Add Daily Challenge'
                  : modalMode === 'edit'
                  ? 'Edit Challenge'
                  : 'Challenge Overview'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                    {selectedItem.name}
                  </h4>
                  <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                  <p className="text-emerald-400 font-bold mt-2">
                    Reward: +{selectedItem.xpReward} XP • Badge: {selectedItem.badgeReward}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Challenge Name</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.name || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
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
                    <label className="text-[#f2ca50] font-semibold block mb-1">XP Reward</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedItem.xpReward || 250}
                      onChange={(e) => setSelectedItem({ ...selectedItem, xpReward: Number(e.target.value) })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
                    />
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

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Status</label>
                    <select
                      value={selectedItem.status || 'Published'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, status: e.target.value as ContentStatus })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#0c1321] rounded-xl border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.isRecurring ?? true}
                      onChange={(e) => setSelectedItem({ ...selectedItem, isRecurring: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-[#f2ca50] font-bold">Auto-Recurring Daily</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.isFeatured || false}
                      onChange={(e) => setSelectedItem({ ...selectedItem, isFeatured: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-amber-300 font-bold">Highlight on Home Screen</span>
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
                    Save Challenge
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this challenge?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

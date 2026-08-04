import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { AchievementItem, RarityLevel, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const AchievementsView: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<AchievementItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    const data = await cmsService.achievements.getAll();
    setAchievements(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      name: 'Night Silence Meditator',
      icon: 'nights_stay',
      description: 'Complete 5 late-night silent dhyana sessions.',
      xpReward: 350,
      badgeName: 'Night Silence Badge',
      unlockCondition: 'Night Sessions >= 5',
      rarity: 'Rare',
      isHidden: false,
      status: 'Published',
      unlockedByCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AchievementItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: AchievementItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: AchievementItem) => {
    await cmsService.achievements.create({
      ...item,
      name: `${item.name} (Copy)`,
    });
    loadAchievements();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.achievements.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.achievements.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadAchievements();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.achievements.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.achievements.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadAchievements();
  };

  const columns: Column<AchievementItem>[] = [
    {
      key: 'name',
      header: 'Achievement',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f2ca50]/10 border border-[#f2ca50]/30 flex items-center justify-center text-[#f2ca50]">
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#dce2f6] text-sm">{item.name}</p>
              {item.isHidden && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 font-bold text-[9px] rounded uppercase">
                  Hidden
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[200px]">
              {item.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'rarity',
      header: 'Rarity',
      sortable: true,
      accessor: (item) => (
        <span
          className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
            item.rarity === 'Legendary'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : item.rarity === 'Epic'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : item.rarity === 'Rare'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
          }`}
        >
          {item.rarity}
        </span>
      ),
    },
    {
      key: 'xpReward',
      header: 'XP Reward',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-bold font-mono text-[#f2ca50]">
          +{item.xpReward} XP
        </span>
      ),
    },
    {
      key: 'unlockCondition',
      header: 'Condition',
      accessor: (item) => (
        <span className="text-xs text-[#d0c5af]">{item.unlockCondition}</span>
      ),
    },
    {
      key: 'unlockedByCount',
      header: 'Unlocked By',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-semibold text-emerald-400">
          {item.unlockedByCount?.toLocaleString()} Seekers
        </span>
      ),
    },
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'rarity',
      label: 'Rarity',
      options: [
        { label: 'Common', value: 'Common' },
        { label: 'Rare', value: 'Rare' },
        { label: 'Epic', value: 'Epic' },
        { label: 'Legendary', value: 'Legendary' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Achievements</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{achievements.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Unlocks</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">55,150</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Legendary Rarity</p>
          <h3 className="text-2xl font-bold font-serif-headline text-amber-300 mt-1">
            {achievements.filter((a) => a.rarity === 'Legendary').length} Badges
          </h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total XP Awarded</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">1.2M XP</h3>
        </div>
      </div>

      <DataTable
        title="Achievements CMS"
        description="Configure spiritual milestones, unlock conditions, rarity tiers, and XP bonuses for seekers."
        data={achievements}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['name', 'description', 'unlockCondition']}
        searchPlaceholder="Search achievements, early riser, flame..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Achievement"
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
                <span className="material-symbols-outlined">military_tech</span>
                {modalMode === 'create'
                  ? 'Add Achievement'
                  : modalMode === 'edit'
                  ? 'Edit Achievement'
                  : 'Achievement Overview'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-[#f2ca50]/20 border border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50]">
                    <span className="material-symbols-outlined text-3xl">{selectedItem.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                    <p className="text-emerald-400 font-bold mt-2">
                      Condition: {selectedItem.unlockCondition} • Reward: +{selectedItem.xpReward} XP
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Achievement Name</label>
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
                    <label className="text-[#f2ca50] font-semibold block mb-1">Material Icon</label>
                    <input
                      type="text"
                      value={selectedItem.icon || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, icon: e.target.value })}
                      placeholder="wb_sunny, local_fire_department..."
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Rarity Tier</label>
                    <select
                      value={selectedItem.rarity || 'Common'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, rarity: e.target.value as RarityLevel })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">XP Reward</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedItem.xpReward || 100}
                      onChange={(e) => setSelectedItem({ ...selectedItem, xpReward: Number(e.target.value) })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Unlock Rule Condition</label>
                  <input
                    type="text"
                    value={selectedItem.unlockCondition || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, unlockCondition: e.target.value })}
                    placeholder="e.g., Complete 1 Morning Practice"
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-[#0c1321] rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={selectedItem.isHidden || false}
                    onChange={(e) => setSelectedItem({ ...selectedItem, isHidden: e.target.checked })}
                    className="rounded bg-[#19202e] text-[#f2ca50]"
                  />
                  <span className="text-[#f2ca50] font-bold">Hidden Secret Achievement (Revealed upon unlocking)</span>
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
                    Save Achievement
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this achievement?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { StreakGlobalRules, StreakMilestone } from '../../types/cmsTypes';
import { DataTable, Column } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const StreakSystemView: React.FC = () => {
  const [rules, setRules] = useState<StreakGlobalRules>({
    minPracticeTimeMinutes: 10,
    freezeDaysAllowed: 2,
    recoveryOptionEnabled: true,
    bonusRewardsMultiplier: 1.5,
  });
  const [milestones, setMilestones] = useState<StreakMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<StreakMilestone>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const r = await cmsService.streaks.getRules();
    const m = await cmsService.streaks.getMilestones();
    setRules(r);
    setMilestones(m);
    setIsLoading(false);
  };

  const handleSaveGlobalRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    await cmsService.streaks.updateRules(rules);
    setIsSavingRules(false);
    alert('Global Streak Rules updated successfully!');
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      days: 50,
      rewardText: 'Unlock Special Flame Aura Theme',
      badgeName: '50-Day Devotion Seal',
      animation: 'Particle',
      notificationMessage: '50 Days of Daily Sadhana! Flame aura unlocked!',
      xpBonus: 2500,
      status: 'Published',
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StreakMilestone) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.streaks.createMilestone(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.streaks.updateMilestone(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.streaks.deleteMilestone(deleteTargetId);
      setDeleteTargetId(null);
      loadData();
    }
  };

  const columns: Column<StreakMilestone>[] = [
    {
      key: 'days',
      header: 'Milestone',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50]">local_fire_department</span>
          <span className="font-bold text-[#f2ca50] font-mono text-sm">{item.days} Days</span>
        </div>
      ),
    },
    {
      key: 'rewardText',
      header: 'Reward',
      accessor: (item) => <span className="text-xs text-[#dce2f6] font-semibold">{item.rewardText}</span>,
    },
    {
      key: 'badgeName',
      header: 'Badge',
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-semibold">
          🏅 {item.badgeName}
        </span>
      ),
    },
    {
      key: 'xpBonus',
      header: 'XP Bonus',
      sortable: true,
      accessor: (item) => (
        <span className="text-xs font-mono font-bold text-emerald-400">+{item.xpBonus} XP</span>
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

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      {/* Global Rules Panel */}
      <div className="bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#f2ca50] text-2xl">local_fire_department</span>
            <div>
              <h2 className="font-serif-headline text-xl font-bold text-[#f2ca50]">Global Streak Rules</h2>
              <p className="text-xs text-[#d0c5af]/70">Configure daily requirements, freeze days, and bonus multipliers.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveGlobalRules} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[#f2ca50] font-semibold block mb-1">Min Practice Time (Mins)</label>
            <input
              type="number"
              min={1}
              value={rules.minPracticeTimeMinutes}
              onChange={(e) => setRules({ ...rules, minPracticeTimeMinutes: Number(e.target.value) })}
              className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
            />
          </div>

          <div>
            <label className="text-[#f2ca50] font-semibold block mb-1">Freeze Days Allowed</label>
            <input
              type="number"
              min={0}
              value={rules.freezeDaysAllowed}
              onChange={(e) => setRules({ ...rules, freezeDaysAllowed: Number(e.target.value) })}
              className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
            />
          </div>

          <div>
            <label className="text-[#f2ca50] font-semibold block mb-1">Bonus Rewards Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={rules.bonusRewardsMultiplier}
              onChange={(e) => setRules({ ...rules, bonusRewardsMultiplier: Number(e.target.value) })}
              className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSavingRules}
              className="w-full py-2.5 bg-[#f2ca50] text-[#3c2f00] font-bold rounded-xl hover:bg-[#ffe082] transition-colors shadow-md"
            >
              Update Global Rules
            </button>
          </div>
        </form>
      </div>

      {/* Milestones Data Table */}
      <DataTable
        title="Streak Milestone Rewards"
        description="Configure rewards unlocked at 3, 7, 14, 21, 30, 50, 100, and 365 Days."
        data={milestones}
        columns={columns}
        searchFields={['rewardText', 'badgeName']}
        searchPlaceholder="Search 3 days, 7 days, 100 days..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Milestone"
        onEdit={handleOpenEdit}
        onDelete={(item) => setDeleteTargetId(item.id)}
      />

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                {modalMode === 'create' ? 'Add Streak Milestone' : 'Edit Milestone'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Streak Days Required</label>
                  <input
                    type="number"
                    required
                    value={selectedItem.days || 3}
                    onChange={(e) => setSelectedItem({ ...selectedItem, days: Number(e.target.value) })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">XP Bonus</label>
                  <input
                    type="number"
                    value={selectedItem.xpBonus || 150}
                    onChange={(e) => setSelectedItem({ ...selectedItem, xpBonus: Number(e.target.value) })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Reward Description</label>
                <input
                  type="text"
                  value={selectedItem.rewardText || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, rewardText: e.target.value })}
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                />
              </div>

              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Badge Name</label>
                <input
                  type="text"
                  value={selectedItem.badgeName || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, badgeName: e.target.value })}
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                />
              </div>

              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Push Notification Message</label>
                <input
                  type="text"
                  value={selectedItem.notificationMessage || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, notificationMessage: e.target.value })}
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                />
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
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        message="Are you sure you want to delete this streak milestone?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

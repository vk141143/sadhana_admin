import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { RecommendationRuleItem, EmotionType, DifficultyLevel, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const RecommendationsView: React.FC = () => {
  const [rules, setRules] = useState<RecommendationRuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<RecommendationRuleItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    const data = await cmsService.recommendations.getAll();
    setRules(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      ruleName: 'Overthinking Mind Reset Protocol',
      triggerEmotion: 'Overthinking',
      userLevel: 'Beginner',
      contentType: 'Practice',
      recommendedItemIds: ['item-1', 'item-2'],
      priority: 1,
      status: 'Published',
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RecommendationRuleItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.recommendations.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.recommendations.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadRules();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.recommendations.delete(deleteTargetId);
      setDeleteTargetId(null);
      loadRules();
    }
  };

  const columns: Column<RecommendationRuleItem>[] = [
    {
      key: 'ruleName',
      header: 'Rule Name',
      sortable: true,
      accessor: (item) => (
        <div>
          <p className="font-semibold text-[#dce2f6] text-sm">{item.ruleName}</p>
          <p className="text-[10px] text-[#d0c5af]/60">Trigger: {item.triggerEmotion}</p>
        </div>
      ),
    },
    {
      key: 'triggerEmotion',
      header: 'Trigger Emotion',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-semibold">
          {item.triggerEmotion}
        </span>
      ),
    },
    {
      key: 'userLevel',
      header: 'Target Level',
      accessor: (item) => <span className="text-xs text-[#d0c5af]">{item.userLevel}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      accessor: (item) => (
        <span className="px-2 py-0.5 bg-[#232a39] text-[#f2ca50] font-bold text-xs rounded">
          P{item.priority}
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

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Active AI Rules</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{rules.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Match Accuracy</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">96.8%</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Daily Recs Served</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">128,000</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">P1 Priority Rules</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">
            {rules.filter((r) => r.priority === 1).length} Rules
          </h3>
        </div>
      </div>

      <DataTable
        title="Recommendation Engine Rules CMS"
        description="Configure AI recommendation rules matching emotional triggers and experience levels to personalized practices."
        data={rules}
        columns={columns}
        searchFields={['ruleName', 'triggerEmotion']}
        searchPlaceholder="Search overthinking, stress, anxiety..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Recommendation Rule"
        onEdit={handleOpenEdit}
        onDelete={(item) => setDeleteTargetId(item.id)}
      />

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                {modalMode === 'create' ? 'Add Recommendation Rule' : 'Edit Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={selectedItem.ruleName || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, ruleName: e.target.value })}
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Trigger Emotion</label>
                  <select
                    value={selectedItem.triggerEmotion || 'Stress'}
                    onChange={(e) => setSelectedItem({ ...selectedItem, triggerEmotion: e.target.value as EmotionType })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  >
                    {['Stress', 'Anxiety', 'Fear', 'Anger', 'Peace', 'Overthinking'].map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Target User Level</label>
                  <select
                    value={selectedItem.userLevel || 'Beginner'}
                    onChange={(e) => setSelectedItem({ ...selectedItem, userLevel: e.target.value as DifficultyLevel })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Priority (1 = Top)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={selectedItem.priority || 1}
                    onChange={(e) => setSelectedItem({ ...selectedItem, priority: Number(e.target.value) })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-bold"
                  />
                </div>
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
                  Save Recommendation Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        message="Are you sure you want to delete this recommendation rule?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

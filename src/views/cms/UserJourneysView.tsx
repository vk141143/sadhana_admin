import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { UserJourneyItem, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';

export const UserJourneysView: React.FC = () => {
  const [journeys, setJourneys] = useState<UserJourneyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<UserJourneyItem>>({});

  // Deletions
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    setIsLoading(true);
    const data = await cmsService.journeys.getAll();
    setJourneys(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      name: '14-Day Chakra Activation Journey',
      coverImage: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=600',
      description: 'Systematic daily chakra awakenings starting from root to crown.',
      durationDays: 14,
      dailyPracticesCount: 2,
      dailySchedule: [
        { day: 1, title: 'Day 1: Root Chakra Grounding', practiceId: 'prac-1' },
      ],
      progressRules: 'Complete daily chakra meditation.',
      completionRewardBadge: 'Chakra Master Seal',
      completionRewardCertificate: true,
      isPremium: true,
      status: 'Published',
      activeEnrollees: 0,
      completionCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: UserJourneyItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: UserJourneyItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: UserJourneyItem) => {
    await cmsService.journeys.create({
      ...item,
      name: `${item.name} (Copy)`,
    });
    loadJourneys();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.journeys.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.journeys.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadJourneys();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.journeys.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.journeys.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadJourneys();
  };

  const columns: Column<UserJourneyItem>[] = [
    {
      key: 'name',
      header: 'Journey',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.coverImage}
            alt={item.name}
            className="w-12 h-12 rounded-xl object-cover border border-white/10"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#dce2f6] text-sm">{item.name}</p>
              {item.isPremium && (
                <span className="px-1.5 py-0.5 bg-[#f2ca50]/20 text-[#f2ca50] font-bold text-[9px] rounded uppercase">
                  Premium
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
      key: 'durationDays',
      header: 'Duration',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-bold font-mono">
          {item.durationDays} Days
        </span>
      ),
    },
    {
      key: 'completionRewardBadge',
      header: 'Rewards',
      accessor: (item) => (
        <div className="text-[11px] space-y-0.5">
          <p className="text-[#d0c5af] font-semibold">🏅 {item.completionRewardBadge}</p>
          {item.completionRewardCertificate && (
            <p className="text-emerald-400 text-[10px]">📜 Official Certificate</p>
          )}
        </div>
      ),
    },
    {
      key: 'activeEnrollees',
      header: 'Seekers',
      sortable: true,
      accessor: (item) => (
        <div className="text-xs">
          <p className="text-[#f2ca50] font-semibold">{item.activeEnrollees?.toLocaleString()} Active</p>
          <p className="text-[#d0c5af]/60 text-[10px]">{item.completionCount?.toLocaleString()} Finished</p>
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
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Active Journeys</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{journeys.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Enrolled Seekers</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">26,150</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Graduated Seekers</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">14,200</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Certificates Issued</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">11,900</h3>
        </div>
      </div>

      <DataTable
        title="User Journeys Management CMS"
        description="Design multi-day spiritual programs (e.g. 21-Day Discipline, 7-Day Peace) with daily milestone rewards."
        data={journeys}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['name', 'description']}
        searchPlaceholder="Search 21-Day, 7-Day, Bhakti..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Create Journey"
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
                <span className="material-symbols-outlined">auto_stories</span>
                {modalMode === 'create'
                  ? 'Create New Journey'
                  : modalMode === 'edit'
                  ? 'Edit Journey'
                  : 'Journey Overview'}
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
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                    <p className="text-[11px] text-emerald-400 font-bold mt-2">
                      Duration: {selectedItem.durationDays} Days • Reward: {selectedItem.completionRewardBadge}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Journey Name</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.name || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                    placeholder="e.g., 21-Day Sacred Discipline"
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

                <MediaUploader
                  label="Journey Cover Banner"
                  type="Image"
                  value={selectedItem.coverImage}
                  onChange={(url) => setSelectedItem({ ...selectedItem, coverImage: url })}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={selectedItem.durationDays || 21}
                      onChange={(e) => setSelectedItem({ ...selectedItem, durationDays: Number(e.target.value) })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Reward Badge Name</label>
                    <input
                      type="text"
                      value={selectedItem.completionRewardBadge || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, completionRewardBadge: e.target.value })}
                      placeholder="e.g. Tapasvi Gold Badge"
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
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
                      checked={selectedItem.completionRewardCertificate ?? true}
                      onChange={(e) => setSelectedItem({ ...selectedItem, completionRewardCertificate: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-[#f2ca50] font-bold">Issue Official Completion Certificate</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.isPremium || false}
                      onChange={(e) => setSelectedItem({ ...selectedItem, isPremium: e.target.checked })}
                      className="rounded bg-[#19202e] text-[#f2ca50]"
                    />
                    <span className="text-amber-300 font-bold">Premium Subscription Only</span>
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
                    Save Journey
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this journey? Enrolled seekers will lose access."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

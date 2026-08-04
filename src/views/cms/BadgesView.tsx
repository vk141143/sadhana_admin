import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { BadgeItem } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const BadgesView: React.FC = () => {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<BadgeItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setIsLoading(true);
    const data = await cmsService.badges.getAll();
    setBadges(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      name: 'Surya Namaskar Sun Salutation Seal',
      icon: 'wb_sunny',
      description: 'Awarded for completing 108 Sun Salutations.',
      colorTheme: '#f2ca50',
      unlockRule: '108 Sun Salutations Completed',
      animationType: 'Shine',
      isVisible: true,
      status: 'Published',
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BadgeItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: BadgeItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: BadgeItem) => {
    await cmsService.badges.create({
      ...item,
      name: `${item.name} (Copy)`,
    });
    loadBadges();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.badges.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.badges.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadBadges();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.badges.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.badges.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadBadges();
  };

  const columns: Column<BadgeItem>[] = [
    {
      key: 'name',
      header: 'Badge',
      sortable: true,
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/20 shadow-md"
            style={{ backgroundColor: item.colorTheme }}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-[#dce2f6] text-sm">{item.name}</p>
            <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[200px]">
              {item.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'animationType',
      header: 'Animation FX',
      sortable: true,
      accessor: (item) => (
        <span className="px-2.5 py-1 bg-[#0c1321] text-[#f2ca50] rounded-lg border border-white/10 text-xs font-bold">
          ✨ {item.animationType}
        </span>
      ),
    },
    {
      key: 'unlockRule',
      header: 'Unlock Rule',
      accessor: (item) => <span className="text-xs text-[#d0c5af]">{item.unlockRule}</span>,
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
      key: 'animationType',
      label: 'Animation',
      options: [
        { label: 'Glow', value: 'Glow' },
        { label: 'Shine', value: 'Shine' },
        { label: 'Particle', value: 'Particle' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Badges</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{badges.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Badges Awarded</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">32,400</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Active FX Types</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">5 FX</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Visible to All</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">100%</h3>
        </div>
      </div>

      <DataTable
        title="Badges Management CMS"
        description="Design visual digital badges, color themes, unlock triggers, and particle/glow animations."
        data={badges}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['name', 'description', 'unlockRule']}
        searchPlaceholder="Search badges, shanti, golden lotus..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Badge"
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
                <span className="material-symbols-outlined">verified</span>
                {modalMode === 'create'
                  ? 'Add Badge'
                  : modalMode === 'edit'
                  ? 'Edit Badge'
                  : 'Badge Overview'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-4 bg-[#0c1321] rounded-2xl border border-white/10">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedItem.colorTheme }}
                  >
                    <span className="material-symbols-outlined text-3xl">{selectedItem.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[#d0c5af]/80 mt-1">{selectedItem.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Badge Name</label>
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
                      placeholder="spa, verified, local_fire_department"
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Color Theme</label>
                    <input
                      type="color"
                      value={selectedItem.colorTheme || '#f2ca50'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, colorTheme: e.target.value })}
                      className="w-full h-10 bg-[#0c1321] border border-white/10 rounded-xl p-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Animation Type</label>
                    <select
                      value={selectedItem.animationType || 'Glow'}
                      onChange={(e) => setSelectedItem({ ...selectedItem, animationType: e.target.value as any })}
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    >
                      <option value="Glow">Glow</option>
                      <option value="Pulse">Pulse</option>
                      <option value="Shine">Shine</option>
                      <option value="Particle">Particle</option>
                      <option value="Spin">Spin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Unlock Rule</label>
                  <input
                    type="text"
                    value={selectedItem.unlockRule || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, unlockRule: e.target.value })}
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
                    Save Badge
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this badge?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

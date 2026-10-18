import React, { useState, useEffect } from 'react';
import { FestivalFull } from '../types';
import {
  fetchFestivalList,
  fetchFestivalFull,
  deleteFestival,
  duplicateFestival,
  publishFestival,
  unpublishFestival,
  FestivalListItem,
} from '../services/festivalService';
import { DataTable, Column } from '../components/common/DataTable';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FestivalWizard } from '../components/FestivalWizard';

export const FestivalsView: React.FC = () => {
  const [festivals, setFestivals] = useState<FestivalListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<FestivalFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadFestivals = async () => {
    try {
      setIsLoading(true);
      const { data } = await fetchFestivalList({ page: 1, limit: 50 });
      setFestivals(data);
    } catch (err) {
      console.error('Failed to load festivals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFestivals();
  }, []);

  const handleAddClick = () => {
    setEditingFestival(null);
    setWizardOpen(true);
  };

  const handleEdit = async (item: FestivalListItem) => {
    try {
      const full = await fetchFestivalFull(item.id);
      setEditingFestival(full);
      setWizardOpen(true);
    } catch (err) {
      alert('Failed to load festival: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFestival(deleteTarget);
      setDeleteTarget(null);
      loadFestivals();
    } catch (err) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDuplicate = async (item: FestivalListItem) => {
    try {
      await duplicateFestival(item.id);
      loadFestivals();
    } catch (err) {
      alert('Failed to duplicate: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handlePublishToggle = async (item: FestivalListItem) => {
    try {
      if (item.status === 'Published') {
        await unpublishFestival(item.id);
      } else {
        await publishFestival(item.id);
      }
      loadFestivals();
    } catch (err) {
      alert('Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const columns: Column<FestivalListItem>[] = [
    {
      key: 'name',
      header: 'Festival',
      sortable: true,
      accessor: (item) => (
        <div>
          <p className="font-semibold text-[#dce2f6]">{item.name}</p>
          {item.alternate_name && (
            <p className="text-[10px] text-[#d0c5af]/60">{item.alternate_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'festival_date',
      header: 'Date',
      sortable: true,
      accessor: (item) => item.festival_date || '—',
    },
    {
      key: 'festival_type',
      header: 'Type',
      sortable: true,
      accessor: (item) => (
        <span className="px-2 py-0.5 bg-[#f2ca50]/10 text-[#f2ca50] text-[10px] font-bold rounded">
          {item.festival_type}
        </span>
      ),
    },
    {
      key: 'primary_deity',
      header: 'Deity',
      accessor: (item) => item.primary_deity || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (item) => {
        const color =
          item.status === 'Published'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            : item.status === 'Archived'
            ? 'bg-white/5 text-[#d0c5af]/60 border-white/10'
            : 'bg-amber-500/10 text-amber-300 border-amber-500/20';
        return (
          <span className={`px-2 py-0.5 border rounded text-[10px] font-bold ${color}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (item) => (item.is_featured ? '⭐' : '—'),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      accessor: (item) => item.created_at?.split('T')[0] || '—',
    },
  ];

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Festival Management
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Create, edit, and manage Vedic festivals with complete details.
          </p>
        </div>
      </div>

      <DataTable
        title="Festivals"
        description="Manage all festivals in the system"
        data={festivals}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search festivals..."
        searchFields={['name', 'alternate_name', 'short_description']}
        filterOptions={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Published', value: 'Published' },
              { label: 'Archived', value: 'Archived' },
            ],
          },
          {
            key: 'festival_type',
            label: 'Type',
            options: [
              { label: 'Major Festival', value: 'Major Festival' },
              { label: 'Ekadashi', value: 'Ekadashi' },
              { label: 'Purnima', value: 'Purnima' },
              { label: 'Amavasya', value: 'Amavasya' },
              { label: 'Jayanti', value: 'Jayanti' },
              { label: 'Vrata', value: 'Vrata' },
              { label: 'Utsava', value: 'Utsava' },
              { label: 'Other', value: 'Other' },
            ],
          },
        ]}
        onAddClick={handleAddClick}
        addLabel="Add Festival"
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={(item) => setDeleteTarget(item.id)}
        customHeaderActions={
          <button
            onClick={() => { setEditingFestival(null); setWizardOpen(true); }}
            className="px-3.5 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 text-xs font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">publish</span>
            Publish Selected
          </button>
        }
      />

      <FestivalWizard
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditingFestival(null); }}
        onSuccess={loadFestivals}
        editingFestival={editingFestival}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Festival"
        message={
          'Are you sure you want to delete this festival?\n\nThis will permanently remove:\n• Festival information\n• Regional mappings\n• Timings\n• Media references\n• Notification configuration\n• Cloudflare R2 content'
        }
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        isHazard
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

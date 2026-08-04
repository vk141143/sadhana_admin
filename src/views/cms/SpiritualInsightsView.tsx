import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { SpiritualInsightItem, ContentStatus } from '../../types/cmsTypes';
import { DataTable, Column, FilterOption } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MediaUploader } from '../../components/common/MediaUploader';
import { RichTextEditor } from '../../components/common/RichTextEditor';

export const SpiritualInsightsView: React.FC = () => {
  const [insights, setInsights] = useState<SpiritualInsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<Partial<SpiritualInsightItem>>({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    const data = await cmsService.insights.getAll();
    setInsights(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setSelectedItem({
      title: 'Action Without Attachment (Karma Yoga)',
      quoteText: 'Karmanye vadhikaraste ma phaleshu kadachana.',
      scriptureSource: 'Bhagavad Gita Chapter 2, Verse 47',
      translation: 'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.',
      explanation: 'Focus completely on the effort itself with devotion and stillness. Detach your heart from fears of outcomes or praise.',
      category: 'Gita Wisdom',
      publishDate: new Date().toISOString().split('T')[0],
      isFeatured: true,
      status: 'Published',
      likesCount: 0,
      sharesCount: 0,
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SpiritualInsightItem) => {
    setSelectedItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (item: SpiritualInsightItem) => {
    setSelectedItem({ ...item });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (item: SpiritualInsightItem) => {
    await cmsService.insights.create({
      ...item,
      title: `${item.title} (Copy)`,
    });
    loadInsights();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      await cmsService.insights.create(selectedItem);
    } else if (modalMode === 'edit' && selectedItem.id) {
      await cmsService.insights.update(selectedItem.id, selectedItem);
    }
    setIsModalOpen(false);
    loadInsights();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await cmsService.insights.delete(deleteTargetId);
      setDeleteTargetId(null);
    } else if (bulkDeleteIds) {
      await cmsService.insights.deleteMany(bulkDeleteIds);
      setBulkDeleteIds(null);
    }
    loadInsights();
  };

  const columns: Column<SpiritualInsightItem>[] = [
    {
      key: 'title',
      header: 'Spiritual Insight',
      sortable: true,
      accessor: (item) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[#dce2f6] text-sm">{item.title}</p>
            {item.isFeatured && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[9px] rounded uppercase">
                Daily Highlight
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#d0c5af]/60 truncate max-w-[220px]">
            {item.scriptureSource}
          </p>
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
      key: 'likesCount',
      header: 'Engagement',
      accessor: (item) => (
        <div className="text-[11px] text-[#d0c5af]/80 space-y-0.5">
          <p>❤️ {item.likesCount?.toLocaleString()} Likes</p>
          <p className="text-[10px] text-[#d0c5af]/50">🔄 {item.sharesCount?.toLocaleString()} Shares</p>
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
      key: 'category',
      label: 'Category',
      options: [
        { label: 'Gita Wisdom', value: 'Gita Wisdom' },
        { label: 'Upanishads', value: 'Upanishads' },
        { label: 'Vedic Philosophy', value: 'Vedic Philosophy' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Insights</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">{insights.length}</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Likes</p>
          <h3 className="text-2xl font-bold font-serif-headline text-emerald-400 mt-1">94,200</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Total Shares</p>
          <h3 className="text-2xl font-bold font-serif-headline text-blue-400 mt-1">31,800</h3>
        </div>
        <div className="bg-[#19202e] p-4 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs text-[#d0c5af]/60 uppercase tracking-wider font-semibold">Scheduled Insights</p>
          <h3 className="text-2xl font-bold font-serif-headline text-[#f2ca50] mt-1">12 Days</h3>
        </div>
      </div>

      <DataTable
        title="Spiritual Insights CMS"
        description="Publish daily quotes, shlokas, scriptures commentary, and audio discourses."
        data={insights}
        columns={columns}
        filterOptions={filterOptions}
        searchFields={['title', 'quoteText', 'scriptureSource']}
        searchPlaceholder="Search Gita, Upanishad, Shloka..."
        isLoading={isLoading}
        onAddClick={handleOpenCreate}
        addLabel="Add Insight"
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
                <span className="material-symbols-outlined">auto_awesome</span>
                {modalMode === 'create'
                  ? 'Add Spiritual Insight'
                  : modalMode === 'edit'
                  ? 'Edit Insight'
                  : 'Insight Details'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#d0c5af] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#0c1321] rounded-2xl border border-white/10 space-y-2">
                  <h4 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
                    {selectedItem.title}
                  </h4>
                  <p className="italic text-base font-serif text-[#dce2f6] border-l-2 border-[#f2ca50] pl-3 py-1">
                    "{selectedItem.quoteText}"
                  </p>
                  <p className="text-[11px] text-[#f2ca50] font-semibold">{selectedItem.scriptureSource}</p>
                  <p className="text-[#d0c5af]/80 leading-relaxed mt-2">{selectedItem.explanation}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Insight Title</label>
                  <input
                    type="text"
                    required
                    value={selectedItem.title || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Sanskrit / Scripture Quote</label>
                    <input
                      type="text"
                      value={selectedItem.quoteText || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, quoteText: e.target.value })}
                      placeholder="e.g. Karmanye vadhikaraste..."
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none font-serif"
                    />
                  </div>

                  <div>
                    <label className="text-[#f2ca50] font-semibold block mb-1">Scripture Source</label>
                    <input
                      type="text"
                      value={selectedItem.scriptureSource || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, scriptureSource: e.target.value })}
                      placeholder="e.g. Bhagavad Gita 2.47"
                      className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Translation</label>
                  <textarea
                    rows={2}
                    value={selectedItem.translation || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, translation: e.target.value })}
                    className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-2.5 text-[#dce2f6] outline-none"
                  />
                </div>

                <RichTextEditor
                  label="Detailed Spiritual Commentary & Practical Application"
                  value={selectedItem.explanation || ''}
                  onChange={(val) => setSelectedItem({ ...selectedItem, explanation: val })}
                />

                <MediaUploader
                  label="Audio Discourse Commentary (Optional)"
                  type="Audio"
                  value={selectedItem.audioCommentaryUrl}
                  onChange={(url) => setSelectedItem({ ...selectedItem, audioCommentaryUrl: url })}
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
                    Save Insight
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId || !!bulkDeleteIds}
        message="Are you sure you want to delete this insight?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTargetId(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
};

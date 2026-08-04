import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<T extends { id: string }> {
  title?: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  filterOptions?: FilterOption[];
  searchFields?: (keyof T)[];
  searchPlaceholder?: string;
  isLoading?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onDelete?: (item: T) => void;
  onBulkDelete?: (ids: string[]) => void;
  customHeaderActions?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  title,
  description,
  data,
  columns,
  filterOptions = [],
  searchFields = [],
  searchPlaceholder = 'Search records...',
  isLoading = false,
  onAddClick,
  addLabel = 'Create New',
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onBulkDelete,
  customHeaderActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search match
      if (search.trim()) {
        const query = search.toLowerCase();
        let matchesSearch = false;
        if (searchFields.length > 0) {
          matchesSearch = searchFields.some((field) => {
            const val = item[field];
            return val && String(val).toLowerCase().includes(query);
          });
        } else {
          // fallback to all string/number fields
          matchesSearch = Object.values(item).some(
            (val) => val && String(val).toLowerCase().includes(query)
          );
        }
        if (!matchesSearch) return false;
      }

      // Dropdown filter matches
      for (const [filterKey, filterValue] of Object.entries(selectedFilters)) {
        if (filterValue && filterValue !== 'ALL') {
          const itemVal = (item as any)[filterKey];
          if (String(itemVal) !== filterValue) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, search, searchFields, selectedFilters]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = (a as any)[sortKey];
      const valB = (b as any)[sortKey];
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination Logic
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pageData.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = columns.map((col) => col.header).join(',');
    const rows = filteredData.map((item) =>
      columns
        .map((col) => {
          const val = (item as any)[col.key];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title || 'export'}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCSV(); // Standard CSV compatible with Excel
  };

  return (
    <div className="space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#19202e] p-5 rounded-2xl border border-white/10 shadow-lg">
        <div>
          {title && (
            <h2 className="font-serif-headline text-xl md:text-2xl font-bold text-[#f2ca50] flex items-center gap-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs text-[#d0c5af]/70 mt-1">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {customHeaderActions}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 text-xs font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
            title="Export CSV"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 text-xs font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
            title="Export Excel"
          >
            <span className="material-symbols-outlined text-sm">table_chart</span>
            Export Excel
          </button>

          {onAddClick && (
            <button
              onClick={onAddClick}
              className="px-4 py-2 bg-[#f2ca50] text-[#3c2f00] font-bold text-xs rounded-xl hover:bg-[#ffe082] transition-all shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#19202e]/80 p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5af]/50 text-sm">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-[#0c1321] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-[#dce2f6] placeholder-[#d0c5af]/40 focus:outline-none focus:ring-1 focus:ring-[#f2ca50]"
          />
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {filterOptions.map((opt) => (
            <select
              key={opt.key}
              value={selectedFilters[opt.key] || 'ALL'}
              onChange={(e) => {
                setSelectedFilters({ ...selectedFilters, [opt.key]: e.target.value });
                setCurrentPage(1);
              }}
              className="bg-[#0c1321] border border-white/10 text-xs text-[#dce2f6] py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#f2ca50]"
            >
              <option value="ALL">All {opt.label}s</option>
              {opt.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}

          {/* Bulk Action Button */}
          {selectedIds.length > 0 && onBulkDelete && (
            <button
              onClick={() => onBulkDelete(selectedIds)}
              className="px-3 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#19202e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0c1321] sticky top-0 z-20 text-[#d0c5af]/80 text-[11px] font-semibold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={pageData.length > 0 && selectedIds.length === pageData.length}
                    onChange={handleSelectAll}
                    className="rounded border-white/20 bg-[#19202e] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`p-4 ${col.sortable ? 'cursor-pointer hover:text-[#f2ca50]' : ''} ${col.className || ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="material-symbols-outlined text-xs">
                          {sortKey === col.key
                            ? sortDirection === 'asc'
                              ? 'arrow_upward'
                              : 'arrow_downward'
                            : 'unfold_more'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {(onView || onEdit || onDuplicate || onDelete) && (
                  <th className="p-4 text-right pr-6">Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-[#dce2f6]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4">
                      <div className="w-4 h-4 bg-white/10 rounded" />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="p-4">
                        <div className="h-4 bg-white/10 rounded w-24" />
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      <div className="h-4 bg-white/10 rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="p-12 text-center text-[#d0c5af]/60 font-serif"
                  >
                    <span className="material-symbols-outlined text-4xl mb-2 text-[#f2ca50]/40">
                      folder_open
                    </span>
                    <p className="text-sm font-semibold">No records found matching criteria</p>
                  </td>
                </tr>
              ) : (
                pageData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-white/20 bg-[#19202e] text-[#f2ca50] focus:ring-[#f2ca50]"
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className={`p-4 ${col.className || ''}`}>
                        {col.accessor
                          ? col.accessor(item)
                          : String((item as any)[col.key] ?? '')}
                      </td>
                    ))}
                    {(onView || onEdit || onDuplicate || onDelete) && (
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                          {onView && (
                            <button
                              onClick={() => onView(item)}
                              className="p-1.5 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/5"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="p-1.5 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/5"
                              title="Edit Record"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                          )}
                          {onDuplicate && (
                            <button
                              onClick={() => onDuplicate(item)}
                              className="p-1.5 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/5"
                              title="Duplicate Record"
                            >
                              <span className="material-symbols-outlined text-lg">content_copy</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(item)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                              title="Delete Record"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 bg-[#0c1321] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#d0c5af]/80">
          <div className="flex items-center gap-3">
            <span>
              Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
            </span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#19202e] border border-white/10 rounded-lg py-1 px-2 text-xs text-[#dce2f6]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="px-3 font-semibold text-[#f2ca50]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

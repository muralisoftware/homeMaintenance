import React, { useState } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2,
  LucideIcon,
  AlertTriangle
} from 'lucide-react';

export interface Column<T> {
  header: string;
  key: keyof T | string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  itemsPerPage?: number;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  idKey?: keyof T;
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  itemsPerPage = 5,
  emptyMessage = "No data found.",
  emptyIcon: EmptyIcon,
  idKey = 'id' as keyof T
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = (a as any)[sortConfig.key];
    const bValue = (b as any)[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-darkblue-400 bg-white rounded-2xl border border-darkblue-200">
        {EmptyIcon && <EmptyIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden shadow-sm">
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-darkblue-900 mb-2">Delete Record?</h3>
            <p className="text-sm text-darkblue-500 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-darkblue-200 text-darkblue-600 font-medium hover:bg-darkblue-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDelete && confirmDeleteId) onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-darkblue-50/50 border-b border-darkblue-100">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 text-xs font-semibold text-darkblue-600 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:bg-darkblue-100/50' : ''
                  } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} transition-colors`}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.header}
                    {col.sortable && sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-4 text-xs font-semibold text-darkblue-600 uppercase tracking-wider text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-darkblue-100">
            {paginatedData.map((item, rowIdx) => (
              <tr key={(item as any)[idKey] || rowIdx} className="hover:bg-darkblue-50/30 transition-colors group">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 rounded-lg hover:bg-gold-50 text-darkblue-400 hover:text-gold-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => setConfirmDeleteId((item as any)[idKey])}
                          className="p-2 rounded-lg hover:bg-red-50 text-darkblue-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-darkblue-100 flex items-center justify-between bg-darkblue-50/20">
          <span className="text-xs text-darkblue-500 font-medium">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-darkblue-200 bg-white text-darkblue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkblue-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-gold-600 text-white shadow-sm'
                      : 'bg-white border border-darkblue-200 text-darkblue-600 hover:bg-darkblue-50'
                  }`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-darkblue-200 bg-white text-darkblue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkblue-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

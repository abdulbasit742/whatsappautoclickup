import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Skeleton from './Skeleton.jsx'
import EmptyState from './EmptyState.jsx'

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data',
  emptyDescription = 'No records found',
  onRowClick,
  pagination,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortKey,
  sortDir,
  onSort,
  rowKey = 'id',
}) {
  const handleSort = (key) => {
    if (!onSort) return
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  const toggleRow = (id) => {
    if (!onSelectionChange) return
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter(r => r !== id))
    } else {
      onSelectionChange([...selectedRows, id])
    }
  }

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (selectedRows.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map(r => r[rowKey]))
    }
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedRows.length === data.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-brand-600"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp size={10} className={sortKey === col.key && sortDir === 'asc' ? 'text-brand-500' : 'text-gray-300 dark:text-gray-600'} />
                        <ChevronDown size={10} className={sortKey === col.key && sortDir === 'desc' ? 'text-brand-500' : 'text-gray-300 dark:text-gray-600'} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 rounded" style={{ width: col.width || '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row[rowKey]}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''} ${selectedRows.includes(row[rowKey]) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleRow(row[rowKey]) }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row[rowKey])}
                        onChange={() => toggleRow(row[rowKey])}
                        className="rounded border-gray-300 dark:border-gray-600 text-brand-600"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="text-gray-900 dark:text-gray-100">{row[col.key] ?? '—'}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && data.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={pagination.onPrev}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {pagination.page} / {Math.ceil(pagination.total / pagination.limit) || 1}
            </span>
            <button
              onClick={pagination.onNext}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

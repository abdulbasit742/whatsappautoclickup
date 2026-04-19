import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export default function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  multi = false,
  label,
  error,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const selected = multi
    ? options.filter(o => (value || []).includes(o.value))
    : options.find(o => o.value === value)

  const handleSelect = (opt) => {
    if (multi) {
      const current = value || []
      if (current.includes(opt.value)) {
        onChange(current.filter(v => v !== opt.value))
      } else {
        onChange([...current, opt.value])
      }
    } else {
      onChange(opt.value)
      setOpen(false)
    }
    setSearch('')
  }

  const displayValue = multi
    ? selected.length > 0 ? `${selected.length} selected` : placeholder
    : selected ? selected.label : placeholder

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors
          ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}
          bg-white dark:bg-gray-800 text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'}
          focus:outline-none focus:ring-2 focus:ring-brand-500`}
      >
        <span className={selected || (multi && selected?.length) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {displayValue}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">No options</div>
            ) : filtered.map((opt) => {
              const isSelected = multi ? (value || []).includes(opt.value) : value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {opt.label}
                  {isSelected && <Check size={14} />}
                </button>
              )
            })}
          </div>
          {multi && selected?.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
              >
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

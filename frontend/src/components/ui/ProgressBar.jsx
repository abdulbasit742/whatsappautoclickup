export default function ProgressBar({ value = 0, max = 100, color = 'brand', size = 'md', label, showValue = false, className = '' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  const colors = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  }

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>}
          {showValue && <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{Math.round(percent)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${colors[color] || colors.brand} ${heights[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

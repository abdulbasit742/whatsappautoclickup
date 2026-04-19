export default function Skeleton({ className = '', lines = 1, variant = 'line' }) {
  if (variant === 'card') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </div>
    )
  }

  if (variant === 'table-row') {
    return (
      <div className="flex gap-4 py-3 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
    )
  }

  if (variant === 'avatar') {
    return (
      <div className={`rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`} />
    )
  }

  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

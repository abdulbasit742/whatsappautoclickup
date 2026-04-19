import { forwardRef } from 'react'

const DatePicker = forwardRef(function DatePicker({ label, error, className = '', ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      )}
      <input
        ref={ref}
        type="datetime-local"
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})

export default DatePicker

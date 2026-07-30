import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  {
    label,
    error,
    helper,
    iconLeft: IconLeft,
    iconRight: IconRight,
    variant = 'default',
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {IconLeft && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconLeft size={16} className="text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full text-sm rounded-lg border transition-colors duration-150
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            ${error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
            }
            ${IconLeft ? 'pl-9' : 'pl-3'}
            ${IconRight ? 'pr-9' : 'pr-3'}
            py-2
            ${className}
          `}
          {...props}
        />
        {IconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <IconRight size={16} className="text-gray-400" />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>}
    </div>
  )
})

export default Input

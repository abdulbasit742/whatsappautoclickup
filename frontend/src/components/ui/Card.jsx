export default function Card({
  children,
  variant = 'default',
  className = '',
  header,
  footer,
  padding = true,
  onClick,
}) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
    glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-lg',
    elevated: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md',
    flat: 'bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800',
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl overflow-hidden ${variants[variant]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {header && (
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {typeof header === 'string' ? (
            <h3 className="font-semibold text-gray-900 dark:text-white">{header}</h3>
          ) : header}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {footer}
        </div>
      )}
    </div>
  )
}

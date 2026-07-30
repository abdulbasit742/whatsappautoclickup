import Button from './Button.jsx'

export default function EmptyState({
  icon: Icon,
  title = 'Nothing here',
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
          <Icon size={28} className="text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">{description}</p>
      )}
      {action && actionLabel && (
        <Button variant="primary" size="sm" onClick={action}>{actionLabel}</Button>
      )}
    </div>
  )
}

export default function Tabs({ tabs = [], active, onChange, variant = 'line', className = '' }) {
  const lineStyle = 'border-b border-gray-200 dark:border-gray-700'
  const pillStyle = ''

  return (
    <div className={`${variant === 'line' ? lineStyle : ''} ${className}`}>
      <div className={`flex ${variant === 'pill' ? 'gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl' : 'gap-0'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              flex items-center gap-2 text-sm font-medium transition-all
              ${variant === 'line'
                ? `px-4 py-2.5 -mb-px border-b-2 ${active === tab.key ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`
                : `px-4 py-2 rounded-lg ${active === tab.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`
              }
            `}
          >
            {tab.icon && <tab.icon size={15} />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === tab.key ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

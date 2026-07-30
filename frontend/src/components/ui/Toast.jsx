import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore.js'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'bg-white dark:bg-gray-800 border-l-4 border-emerald-500',
  error: 'bg-white dark:bg-gray-800 border-l-4 border-red-500',
  warning: 'bg-white dark:bg-gray-800 border-l-4 border-amber-500',
  info: 'bg-white dark:bg-gray-800 border-l-4 border-blue-500',
}

const iconColors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

function Toast({ toast }) {
  const removeToast = useUIStore(s => s.removeToast)
  const Icon = icons[toast.type] || Info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`flex items-start gap-3 p-4 rounded-xl shadow-lg min-w-72 max-w-sm ${styles[toast.type] || styles.info}`}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconColors[toast.type] || iconColors.info}`} />
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-gray-900 dark:text-white">{toast.title}</p>}
        <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export default Toast

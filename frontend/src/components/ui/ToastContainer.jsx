import { AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/uiStore.js'
import Toast from './Toast.jsx'

export default function ToastContainer() {
  const toasts = useUIStore(s => s.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

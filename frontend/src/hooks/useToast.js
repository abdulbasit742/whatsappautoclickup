import { useUIStore } from '../stores/uiStore.js'

export function useToast() {
  const addToast = useUIStore(s => s.addToast)

  return {
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
    custom: (toast) => addToast(toast),
  }
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let toastId = 0

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      darkMode: false,
      notifications: [],
      toasts: [],
      notificationCount: 0,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      addToast: (toast) => {
        const id = ++toastId
        const newToast = { id, ...toast, duration: toast.duration ?? 4000 }
        set((s) => ({ toasts: [...s.toasts, newToast] }))
        if (newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, newToast.duration)
        }
        return id
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setNotifications: (notifications) =>
        set({
          notifications,
          notificationCount: notifications.filter((n) => !n.read).length,
        }),

      addNotification: (notification) =>
        set((s) => ({
          notifications: [notification, ...s.notifications],
          notificationCount: s.notificationCount + 1,
        })),

      markNotificationRead: (id) =>
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
          return {
            notifications,
            notificationCount: notifications.filter((n) => !n.read).length,
          }
        }),

      clearNotificationCount: () => set({ notificationCount: 0 }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ darkMode: state.darkMode, sidebarOpen: state.sidebarOpen }),
    }
  )
)

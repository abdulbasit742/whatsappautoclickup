import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useUIStore = create(
  devtools(
    (set) => ({
      theme: localStorage.getItem('theme') || 'dark', // 'dark' | 'light'
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          localStorage.setItem('theme', next);
          document.documentElement.classList.toggle('dark', next === 'dark');
          document.documentElement.classList.toggle('light', next === 'light');
          return { theme: next };
        }),

      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'UIStore' }
  )
);

export default useUIStore;

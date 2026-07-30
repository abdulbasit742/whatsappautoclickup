import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      token: null,
      refreshToken: null,

      login: ({ user, org, token, refreshToken }) => {
        set({ user, org, token, refreshToken })
      },

      logout: () => {
        set({ user: null, org: null, token: null, refreshToken: null })
      },

      setUser: (user) => set({ user }),

      updateOrg: (org) => set({ org }),

      setTokens: (token, refreshToken) => set({ token, refreshToken }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

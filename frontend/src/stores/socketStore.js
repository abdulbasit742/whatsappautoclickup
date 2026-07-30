import { create } from 'zustand'
import { io } from 'socket.io-client'

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  subscriptions: {},

  connect: (token) => {
    const existing = get().socket
    if (existing) existing.disconnect()

    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))

    set({ socket })
    return socket
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },

  subscribe: (event, handler) => {
    const socket = get().socket
    if (socket) {
      socket.on(event, handler)
      set((s) => ({
        subscriptions: { ...s.subscriptions, [event]: handler },
      }))
    }
  },

  unsubscribe: (event) => {
    const socket = get().socket
    const handler = get().subscriptions[event]
    if (socket && handler) {
      socket.off(event, handler)
      set((s) => {
        const subs = { ...s.subscriptions }
        delete subs[event]
        return { subscriptions: subs }
      })
    }
  },

  emit: (event, data) => {
    const socket = get().socket
    if (socket) socket.emit(event, data)
  },
}))

import { useEffect } from 'react'
import { useSocketStore } from '../stores/socketStore.js'
import { useAuthStore } from '../stores/authStore.js'

export function useSocket() {
  const { socket, connect, disconnect, subscribe, unsubscribe, emit, connected } = useSocketStore()
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (token && !socket) {
      connect(token)
    }
    return () => {}
  }, [token])

  const on = (event, handler) => {
    if (socket) {
      socket.on(event, handler)
      return () => socket.off(event, handler)
    }
    return () => {}
  }

  return { socket, connected, on, emit, subscribe, unsubscribe }
}

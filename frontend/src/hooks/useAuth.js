import { useAuthStore } from '../stores/authStore.js'
import { authService } from '../services/auth.service.js'
import { useNavigate } from 'react-router-dom'
import { useToast } from './useToast.js'

export function useAuth() {
  const { user, org, token, login, logout } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogin = async (credentials) => {
    try {
      const data = await authService.login(credentials)
      login(data)
      navigate('/app/dashboard')
      return data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
      throw err
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (_) {}
    logout()
    navigate('/login')
  }

  return {
    user,
    org,
    token,
    isAuthenticated: !!token,
    login: handleLogin,
    logout: handleLogout,
  }
}

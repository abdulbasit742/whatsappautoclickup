import api from './api.js'

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }).then(r => r.data),
}

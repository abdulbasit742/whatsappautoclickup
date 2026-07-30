import api from './api.js'

export const analyticsService = {
  dashboard: (params) => api.get('/analytics/dashboard', { params }).then(r => r.data),
  messaging: (params) => api.get('/analytics/messaging', { params }).then(r => r.data),
  campaigns: (params) => api.get('/analytics/campaigns', { params }).then(r => r.data),
  crm: (params) => api.get('/analytics/crm', { params }).then(r => r.data),
  ai: (params) => api.get('/analytics/ai', { params }).then(r => r.data),
  team: (params) => api.get('/analytics/team', { params }).then(r => r.data),
  billing: (params) => api.get('/analytics/billing', { params }).then(r => r.data),
}

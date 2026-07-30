import api from './api.js'

export const settingsService = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data) => api.put('/settings', data).then(r => r.data),
  apiKeys: () => api.get('/settings/api-keys').then(r => r.data),
  addApiKey: (data) => api.post('/settings/api-keys', data).then(r => r.data),
  deleteApiKey: (id) => api.delete(`/settings/api-keys/${id}`).then(r => r.data),
  testApiKey: (id) => api.post(`/settings/api-keys/${id}/test`).then(r => r.data),
  featureFlags: () => api.get('/settings/feature-flags').then(r => r.data),
  updateFeatureFlag: (id, data) => api.put(`/settings/feature-flags/${id}`, data).then(r => r.data),
  createFeatureFlag: (data) => api.post('/settings/feature-flags', data).then(r => r.data),
  auditLogs: (params) => api.get('/settings/audit-logs', { params }).then(r => r.data),
}

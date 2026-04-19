import api from './api.js'

export const campaignsService = {
  list: (params) => api.get('/campaigns', { params }).then(r => r.data),
  get: (id) => api.get(`/campaigns/${id}`).then(r => r.data),
  create: (data) => api.post('/campaigns', data).then(r => r.data),
  update: (id, data) => api.put(`/campaigns/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/campaigns/${id}`).then(r => r.data),
  launch: (id) => api.post(`/campaigns/${id}/launch`).then(r => r.data),
  pause: (id) => api.post(`/campaigns/${id}/pause`).then(r => r.data),
  approve: (id) => api.post(`/campaigns/${id}/approve`).then(r => r.data),
  logs: (id, params) => api.get(`/campaigns/${id}/logs`, { params }).then(r => r.data),
  stats: (id) => api.get(`/campaigns/${id}/stats`).then(r => r.data),
}

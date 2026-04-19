import api from './api.js'

export const followupsService = {
  list: (params) => api.get('/followups', { params }).then(r => r.data),
  get: (id) => api.get(`/followups/${id}`).then(r => r.data),
  create: (data) => api.post('/followups', data).then(r => r.data),
  update: (id, data) => api.put(`/followups/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/followups/${id}`).then(r => r.data),
  complete: (id) => api.post(`/followups/${id}/complete`).then(r => r.data),
}

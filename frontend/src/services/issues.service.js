import api from './api.js'

export const issuesService = {
  list: (params) => api.get('/issues', { params }).then(r => r.data),
  get: (id) => api.get(`/issues/${id}`).then(r => r.data),
  create: (data) => api.post('/issues', data).then(r => r.data),
  update: (id, data) => api.put(`/issues/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/issues/${id}`).then(r => r.data),
  resolve: (id) => api.post(`/issues/${id}/resolve`).then(r => r.data),
  addComment: (id, comment) => api.post(`/issues/${id}/comments`, { comment }).then(r => r.data),
  getComments: (id) => api.get(`/issues/${id}/comments`).then(r => r.data),
}

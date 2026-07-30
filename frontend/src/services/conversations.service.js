import api from './api.js'

export const conversationsService = {
  list: (params) => api.get('/conversations', { params }).then(r => r.data),
  get: (id) => api.get(`/conversations/${id}`).then(r => r.data),
  messages: (id, params) => api.get(`/conversations/${id}/messages`, { params }).then(r => r.data),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data).then(r => r.data),
  assign: (id, userId) => api.put(`/conversations/${id}/assign`, { userId }).then(r => r.data),
  updateStatus: (id, status) => api.put(`/conversations/${id}/status`, { status }).then(r => r.data),
  addNote: (id, note) => api.post(`/conversations/${id}/notes`, { note }).then(r => r.data),
  markRead: (id) => api.put(`/conversations/${id}/read`).then(r => r.data),
  search: (query) => api.get('/conversations/search', { params: { q: query } }).then(r => r.data),
}

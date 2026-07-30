import api from './api.js'

export const contactsService = {
  list: (params) => api.get('/contacts', { params }).then(r => r.data),
  get: (id) => api.get(`/contacts/${id}`).then(r => r.data),
  create: (data) => api.post('/contacts', data).then(r => r.data),
  update: (id, data) => api.put(`/contacts/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/contacts/${id}`).then(r => r.data),
  import: (formData) => api.post('/contacts/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  export: (params) => api.get('/contacts/export', { params, responseType: 'blob' }).then(r => r.data),
  addNote: (id, note) => api.post(`/contacts/${id}/notes`, { note }).then(r => r.data),
  updateNote: (id, noteId, note) => api.put(`/contacts/${id}/notes/${noteId}`, { note }).then(r => r.data),
  deleteNote: (id, noteId) => api.delete(`/contacts/${id}/notes/${noteId}`).then(r => r.data),
  timeline: (id, params) => api.get(`/contacts/${id}/timeline`, { params }).then(r => r.data),
  bulkUpdate: (ids, data) => api.put('/contacts/bulk', { ids, ...data }).then(r => r.data),
  bulkDelete: (ids) => api.delete('/contacts/bulk', { data: { ids } }).then(r => r.data),
}

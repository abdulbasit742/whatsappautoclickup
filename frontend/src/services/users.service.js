import api from './api.js'

export const usersService = {
  list: (params) => api.get('/users', { params }).then(r => r.data),
  get: (id) => api.get(`/users/${id}`).then(r => r.data),
  invite: (data) => api.post('/users/invite', data).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  suspend: (id) => api.post(`/users/${id}/suspend`).then(r => r.data),
  unsuspend: (id) => api.post(`/users/${id}/unsuspend`).then(r => r.data),
  resendInvite: (id) => api.post(`/users/${id}/resend-invite`).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
}

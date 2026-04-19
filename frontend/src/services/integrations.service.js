import api from './api.js'

export const integrationsService = {
  list: () => api.get('/integrations').then(r => r.data),
  get: (id) => api.get(`/integrations/${id}`).then(r => r.data),
  connect: (id, config) => api.post(`/integrations/${id}/connect`, config).then(r => r.data),
  disconnect: (id) => api.post(`/integrations/${id}/disconnect`).then(r => r.data),
  test: (id) => api.post(`/integrations/${id}/test`).then(r => r.data),
  update: (id, config) => api.put(`/integrations/${id}`, config).then(r => r.data),
}

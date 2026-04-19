import api from './api.js'

export const aiService = {
  generate: (data) => api.post('/ai/generate', data).then(r => r.data),
  replySuggestion: (conversationId) => api.post('/ai/reply-suggestion', { conversationId }).then(r => r.data),
  summarize: (data) => api.post('/ai/summarize', data).then(r => r.data),
  leadScore: (contactId) => api.post('/ai/lead-score', { contactId }).then(r => r.data),
  sentiment: (text) => api.post('/ai/sentiment', { text }).then(r => r.data),
  providers: () => api.get('/ai/providers').then(r => r.data),
  usage: (params) => api.get('/ai/usage', { params }).then(r => r.data),
  promptTemplates: () => api.get('/ai/prompt-templates').then(r => r.data),
  createPromptTemplate: (data) => api.post('/ai/prompt-templates', data).then(r => r.data),
  failedRequests: (params) => api.get('/ai/failed-requests', { params }).then(r => r.data),
  toggleFeature: (feature, enabled) => api.put('/ai/features', { feature, enabled }).then(r => r.data),
}

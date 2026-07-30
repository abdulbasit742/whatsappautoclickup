import api from './api.js'

export const billingService = {
  plans: () => api.get('/billing/plans').then(r => r.data),
  subscription: () => api.get('/billing/subscription').then(r => r.data),
  invoices: (params) => api.get('/billing/invoices', { params }).then(r => r.data),
  upgrade: (planId) => api.post('/billing/upgrade', { planId }).then(r => r.data),
  cancel: () => api.post('/billing/cancel').then(r => r.data),
  usage: () => api.get('/billing/usage').then(r => r.data),
  downloadInvoice: (invoiceId) => api.get(`/billing/invoices/${invoiceId}/download`, { responseType: 'blob' }).then(r => r.data),
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/'

export function apiUrl(path) {
  const base = API_URL.replace(/\/+$/, '')
  const endpoint = String(path || '').startsWith('/') ? path : `/${path}`
  const apiBase = base.endsWith('/api') ? base : `${base}/api`
  return `${apiBase}${endpoint}`
}

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    adminRegister: '/auth/admin/register',
    register: '/auth/register',
    me: '/auth/me',
  },
  calls: {
    list: '/calls',
    create: '/calls',
    delete: (callId) => `/calls/${callId}`,
    bulkDelete: '/calls/bulk-delete',
    update: (callId) => `/calls/${callId}`,
    recording: (callId) => `/calls/${callId}/recording`,
    recordingDownload: (callId) => `/calls/${callId}/recording/download`,
  },
  customers: {
    bulk: '/customers/bulk',
    create: '/customers',
    importUrl: '/customers/import-url',
    list: '/customers',
  },
  clients: {
    list: '/clients',
    create: '/clients',
    update: (clientId) => `/clients/${clientId}`,
    delete: (clientId) => `/clients/${clientId}`,
  },
  agents: {
    list: '/agents',
    create: '/agents',
    tracking: '/agents/tracking',
    update: (agentId) => `/agents/${agentId}`,
  },
  dashboard: '/dashboard',
  dialer: {
    authorize: (token) => `/dialer/${token}/authorize`,
    nextCall: (token) => `/dialer/${token}/next-call`,
    outcall: (token) => `/dialer/${token}/outcall`,
    completeCall: (token, callId) => `/dialer/${token}/calls/${callId}/complete`,
    recording: (token, callId) => `/dialer/${token}/calls/${callId}/recording`,
    messages: (token) => `/dialer/${token}/messages`,
    replyMessage: (token, messageId) => `/dialer/${token}/messages/${messageId}/reply`,
    sessions: '/dialer/sessions',
    status: (token) => `/dialer/${token}/status`,
  },
  leads: {
    list: '/leads',
    create: '/leads',
    update: (leadId) => `/leads/${leadId}`,
  },
  google: {
    calendarEvents: '/google/calendar/events',
    token: '/google/oauth/token',
  },
  whatsapp: {
    chats: '/whatsapp/chats',
    messages: (chatId) => `/whatsapp/chats/${encodeURIComponent(chatId)}/messages`,
    reset: '/whatsapp/reset',
    sendMessage: (chatId) => `/whatsapp/chats/${encodeURIComponent(chatId)}/messages`,
    start: '/whatsapp/start',
    status: '/whatsapp/status',
  },
  reports: '/reports',
  messages: {
    create: '/messages',
    mine: '/messages/mine',
    reply: (messageId) => `/messages/${messageId}/reply`,
  },
  staff: {
    list: '/staff',
    update: (staffId) => `/staff/${staffId}`,
    delete: (staffId) => `/staff/${staffId}`,
    bulkDelete: '/staff/bulk-delete',
  },
  settings: {
    cloudinary: '/settings/cloudinary',
  },
}

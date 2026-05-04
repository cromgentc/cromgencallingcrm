const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:5000' : 'https://cromgen-callingcrm.onrender.com'

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl
export const APP_URL = API_URL.replace(/\/+$/, '')

export function apiUrl(path) {
  const base = API_URL.replace(/\/+$/, '')
  const endpoint = String(path || '').startsWith('/') ? path : `/${path}`
  return `${base}${endpoint}`
}

const API_PREFIX = '/api'

export const API_ENDPOINTS = {
  auth: {
    login: `${API_PREFIX}/auth/login`,
    adminRegister: `${API_PREFIX}/auth/admin/register`,
    register: `${API_PREFIX}/auth/register`,
    me: `${API_PREFIX}/auth/me`,
  },
  calls: {
    list: `${API_PREFIX}/calls`,
    create: `${API_PREFIX}/calls`,
    delete: (callId) => `${API_PREFIX}/calls/${callId}`,
    bulkDelete: `${API_PREFIX}/calls/bulk-delete`,
    update: (callId) => `${API_PREFIX}/calls/${callId}`,
  },
  customers: {
    bulk: `${API_PREFIX}/customers/bulk`,
    create: `${API_PREFIX}/customers`,
    importUrl: `${API_PREFIX}/customers/import-url`,
    list: `${API_PREFIX}/customers`,
  },
  clients: {
    list: `${API_PREFIX}/clients`,
    create: `${API_PREFIX}/clients`,
    update: (clientId) => `${API_PREFIX}/clients/${clientId}`,
    delete: (clientId) => `${API_PREFIX}/clients/${clientId}`,
  },
  agents: {
    list: `${API_PREFIX}/agents`,
    create: `${API_PREFIX}/agents`,
    tracking: `${API_PREFIX}/agents/tracking`,
    update: (agentId) => `${API_PREFIX}/agents/${agentId}`,
  },
  dashboard: `${API_PREFIX}/dashboard`,
  dialer: {
    authorize: (token) => `${API_PREFIX}/dialer/${token}/authorize`,
    nextCall: (token) => `${API_PREFIX}/dialer/${token}/next-call`,
    outcall: (token) => `${API_PREFIX}/dialer/${token}/outcall`,
    connectCall: (token, callId) => `${API_PREFIX}/dialer/${token}/calls/${callId}/connect`,
    completeCall: (token, callId) => `${API_PREFIX}/dialer/${token}/calls/${callId}/complete`,
    messages: (token) => `${API_PREFIX}/dialer/${token}/messages`,
    replyMessage: (token, messageId) => `${API_PREFIX}/dialer/${token}/messages/${messageId}/reply`,
    sessions: `${API_PREFIX}/dialer/sessions`,
    status: (token) => `${API_PREFIX}/dialer/${token}/status`,
  },
  leads: {
    list: `${API_PREFIX}/leads`,
    create: `${API_PREFIX}/leads`,
    update: (leadId) => `${API_PREFIX}/leads/${leadId}`,
  },
  google: {
    calendarEvents: `${API_PREFIX}/google/calendar/events`,
    token: `${API_PREFIX}/google/oauth/token`,
  },
  whatsapp: {
    chats: `${API_PREFIX}/whatsapp/chats`,
    messages: (chatId) => `${API_PREFIX}/whatsapp/chats/${encodeURIComponent(chatId)}/messages`,
    reset: `${API_PREFIX}/whatsapp/reset`,
    sendMessage: (chatId) => `${API_PREFIX}/whatsapp/chats/${encodeURIComponent(chatId)}/messages`,
    start: `${API_PREFIX}/whatsapp/start`,
    status: `${API_PREFIX}/whatsapp/status`,
  },
  reports: `${API_PREFIX}/reports`,
  settings: {
    smtp: `${API_PREFIX}/settings/smtp`,
  },
  messages: {
    create: `${API_PREFIX}/messages`,
    mine: `${API_PREFIX}/messages/mine`,
    reply: (messageId) => `${API_PREFIX}/messages/${messageId}/reply`,
  },
  marketing: {
    sendEmail: `${API_PREFIX}/marketing/email/send`,
    emailCampaigns: `${API_PREFIX}/marketing/email/campaigns`,
    scheduleEmail: `${API_PREFIX}/marketing/email/schedule`,
    syncInbox: `${API_PREFIX}/marketing/email/sync-inbox`,
    tracking: `${API_PREFIX}/marketing/email/tracking`,
    updateEmailCampaign: (campaignId) => `${API_PREFIX}/marketing/email/campaigns/${campaignId}`,
  },
  staff: {
    list: `${API_PREFIX}/staff`,
    update: (staffId) => `${API_PREFIX}/staff/${staffId}`,
    delete: (staffId) => `${API_PREFIX}/staff/${staffId}`,
    bulkDelete: `${API_PREFIX}/staff/bulk-delete`,
  },
}

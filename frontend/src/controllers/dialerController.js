import { request } from './httpController'
import { API_ENDPOINTS, apiUrl } from '../services/api'

export function createDialerSession() {
  return request(API_ENDPOINTS.dialer.sessions, {
    method: 'POST',
  })
}

export function authorizeDialer(token, payload) {
  return request(API_ENDPOINTS.dialer.authorize(token), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDialerStatus(token, status) {
  return request(API_ENDPOINTS.dialer.status(token), {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getNextDialerCall(token) {
  return request(API_ENDPOINTS.dialer.nextCall(token), {
    method: 'POST',
  })
}

export function createDialerOutcall(token, payload) {
  return request(API_ENDPOINTS.dialer.outcall(token), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function completeDialerCall(token, callId, payload) {
  return request(API_ENDPOINTS.dialer.completeCall(token, callId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function connectDialerCall(token, callId) {
  return request(API_ENDPOINTS.dialer.connectCall(token, callId), {
    method: 'POST',
  })
}

export async function uploadDialerRecording(token, callId, file) {
  const formData = new FormData()
  formData.append('recording', file)

  const response = await fetch(apiUrl(API_ENDPOINTS.dialer.recording(token, callId)), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Recording upload failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export function getDialerMessages(token) {
  return request(API_ENDPOINTS.dialer.messages(token))
}

export function replyDialerMessage(token, messageId, body) {
  return request(API_ENDPOINTS.dialer.replyMessage(token, messageId), {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getMyMessages() {
  return request(API_ENDPOINTS.messages.mine)
}

export function sendStaffMessage(payload) {
  return request(API_ENDPOINTS.messages.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function replyMessage(messageId, body) {
  return request(API_ENDPOINTS.messages.reply(messageId), {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

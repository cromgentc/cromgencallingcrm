import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export async function createCall(payload) {
  return request(API_ENDPOINTS.calls.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCalls() {
  return request(API_ENDPOINTS.calls.list)
}

export async function updateCall(callId, payload) {
  return request(API_ENDPOINTS.calls.update(callId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteCall(callId) {
  return request(API_ENDPOINTS.calls.delete(callId), {
    method: 'DELETE',
  })
}

export async function deleteCalls(callIds) {
  return request(API_ENDPOINTS.calls.bulkDelete, {
    method: 'DELETE',
    body: JSON.stringify({ callIds }),
  })
}

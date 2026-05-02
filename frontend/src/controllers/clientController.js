import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getClients() {
  return request(API_ENDPOINTS.clients.list)
}

export function createClient(payload) {
  return request(API_ENDPOINTS.clients.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateClient(clientId, payload) {
  return request(API_ENDPOINTS.clients.update(clientId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteClient(clientId) {
  return request(API_ENDPOINTS.clients.delete(clientId), {
    method: 'DELETE',
  })
}

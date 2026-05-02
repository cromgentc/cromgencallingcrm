import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export async function login(payload) {
  return request(API_ENDPOINTS.auth.login, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function registerAccount(payload) {
  return request(API_ENDPOINTS.auth.register, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateProfile(payload) {
  return request(API_ENDPOINTS.auth.me, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

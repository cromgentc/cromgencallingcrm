import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export async function createStaff(payload) {
  return request(API_ENDPOINTS.auth.register, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getStaff() {
  return request(API_ENDPOINTS.staff.list)
}

export async function updateStaff(staffId, payload) {
  return request(API_ENDPOINTS.staff.update(staffId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteStaff(staffId) {
  return request(API_ENDPOINTS.staff.delete(staffId), {
    method: 'DELETE',
  })
}

export async function bulkDeleteStaff(ids) {
  return request(API_ENDPOINTS.staff.bulkDelete, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

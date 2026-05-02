import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getCustomers() {
  return request(API_ENDPOINTS.customers.list)
}

export function createCustomer(payload) {
  return request(API_ENDPOINTS.customers.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function bulkCreateCustomers(rows) {
  return request(API_ENDPOINTS.customers.bulk, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}

export function importCustomersFromUrl(url) {
  return request(API_ENDPOINTS.customers.importUrl, {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getLeads() {
  return request(API_ENDPOINTS.leads.list)
}

export function createLead(payload) {
  return request(API_ENDPOINTS.leads.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateLead(leadId, payload) {
  return request(API_ENDPOINTS.leads.update(leadId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

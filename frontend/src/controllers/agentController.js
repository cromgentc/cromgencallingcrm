import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getAgents() {
  return request(API_ENDPOINTS.agents.list)
}

export function getAgentTracking() {
  return request(API_ENDPOINTS.agents.tracking)
}

export function createAgent(payload) {
  return request(API_ENDPOINTS.agents.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAgent(agentId, payload) {
  return request(API_ENDPOINTS.agents.update(agentId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

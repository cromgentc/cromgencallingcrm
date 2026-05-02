import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export async function getDashboardData() {
  return request(API_ENDPOINTS.dashboard)
}

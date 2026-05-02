import { request } from './httpController'
import { API_ENDPOINTS } from '../services/api'

export function getReports() {
  return request(API_ENDPOINTS.reports)
}

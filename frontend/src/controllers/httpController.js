import { apiUrl } from '../services/api'

export function authHeaders() {
  const token = localStorage.getItem('calltrack_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

import { authHeaders } from './httpController'
import { request } from './httpController'
import { API_ENDPOINTS, apiUrl } from '../services/api'

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

export async function uploadCallRecording(callId, file) {
  const formData = new FormData()
  formData.append('recording', file)

  const response = await fetch(apiUrl(API_ENDPOINTS.calls.recording(callId)), {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Recording upload failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export function getRecordingDownloadUrl(callId) {
  return apiUrl(API_ENDPOINTS.calls.recordingDownload(callId))
}

export async function downloadCallRecording(call) {
  const response = await fetch(getRecordingDownloadUrl(call.id), {
    headers: authHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Recording download failed' }))
    throw new Error(error.message)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${call.id}-recording`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

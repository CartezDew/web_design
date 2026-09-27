const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

let csrfToken = ''

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken
  const response = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' })
  if (!response.ok) throw new ApiError('Unable to start a secure session.', response.status)
  const data = await response.json()
  csrfToken = data.csrfToken
  return csrfToken
}

export async function apiRequest(path, options = {}) {
  const method = options.method || 'GET'
  const headers = new Headers(options.headers || {})
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers.set('X-CSRFToken', await getCsrfToken())
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = data.error?.details || data
    const message = details.detail || Object.values(details)[0]?.[0] || 'The request could not be completed.'
    throw new ApiError(message, response.status, details)
  }
  return data
}

export async function uploadAsset({ file, group, brief, project, idempotencyKey }) {
  const prepared = await apiRequest('/assets/prepare/', {
    method: 'POST',
    body: JSON.stringify({
      name: file.name,
      content_type: file.type,
      size: file.size,
      group,
      brief,
      project,
      idempotency_key: idempotencyKey,
    }),
  })
  const upload = await fetch(prepared.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!upload.ok) throw new ApiError(`Could not upload ${file.name}.`, upload.status)
  return apiRequest(`/assets/${prepared.asset.id}/finalize/`, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  })
}

export { API_BASE }

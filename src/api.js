const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('events360_admin_token')
}

export function setToken(token) {
  localStorage.setItem('events360_admin_token', token)
}

export function clearToken() {
  localStorage.removeItem('events360_admin_token')
}

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getCurrentAdminClaims() {
  const token = getToken()
  if (!token) return null
  return decodeToken(token)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data.detail) detail = data.detail
    } catch {
      // ignore
    }
    throw new Error(detail)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function login(email, password) {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)
  const data = await request('/admin/login', { method: 'POST', body })
  setToken(data.access_token)
  return data
}

export const api = {
  listPendingOrgs: () => request('/admin/organizations/pending'),
  listAllOrgs: () => request('/admin/organizations'),
  approveOrg: (orgId, notes) =>
    request(`/admin/organizations/${orgId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes || null }),
    }),
  denyOrg: (orgId, notes) =>
    request(`/admin/organizations/${orgId}/deny`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes || null }),
    }),
  lockOrg: (orgId) => request(`/admin/organizations/${orgId}/lock`, { method: 'POST' }),
  unlockOrg: (orgId) => request(`/admin/organizations/${orgId}/unlock`, { method: 'POST' }),
  deleteOrg: (orgId) => request(`/admin/organizations/${orgId}`, { method: 'DELETE' }),

  listPlatformAdmins: () => request('/admin/platform-admins'),
  createPlatformAdmin: (payload) =>
    request('/admin/platform-admins', { method: 'POST', body: JSON.stringify(payload) }),
  disablePlatformAdmin: (id) => request(`/admin/platform-admins/${id}/disable`, { method: 'POST' }),
  enablePlatformAdmin: (id) => request(`/admin/platform-admins/${id}/enable`, { method: 'POST' }),
}
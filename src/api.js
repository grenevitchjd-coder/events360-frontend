const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ADMIN_TOKEN_KEY = 'events360_admin_token'
const USER_TOKEN_KEY = 'events360_user_token'

function getStoredToken(key) {
  return localStorage.getItem(key)
}

export function setToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function setUserToken(token) {
  localStorage.setItem(USER_TOKEN_KEY, token)
}
export function clearUserToken() {
  localStorage.removeItem(USER_TOKEN_KEY)
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
  const token = getStoredToken(ADMIN_TOKEN_KEY)
  return token ? decodeToken(token) : null
}

export function getCurrentOrgUserClaims() {
  const token = getStoredToken(USER_TOKEN_KEY)
  return token ? decodeToken(token) : null
}

async function request(path, options = {}, tokenKey = ADMIN_TOKEN_KEY, unauthorizedRedirect = '/login') {
  const token = getStoredToken(tokenKey)
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem(tokenKey)
    window.location.href = unauthorizedRedirect
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

// ---------- Platform admin (Tito) ----------

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

  listOrgEvents: (orgId) => request(`/admin/organizations/${orgId}/events`),
  lockEvent: (orgId, eventId) =>
    request(`/admin/organizations/${orgId}/events/${eventId}/lock`, { method: 'POST' }),
  unlockEvent: (orgId, eventId) =>
    request(`/admin/organizations/${orgId}/events/${eventId}/unlock`, { method: 'POST' }),
  deleteEvent: (orgId, eventId) =>
    request(`/admin/organizations/${orgId}/events/${eventId}`, { method: 'DELETE' }),

  listPlatformAdmins: () => request('/admin/platform-admins'),
  createPlatformAdmin: (payload) =>
    request('/admin/platform-admins', { method: 'POST', body: JSON.stringify(payload) }),
  disablePlatformAdmin: (id) => request(`/admin/platform-admins/${id}/disable`, { method: 'POST' }),
  enablePlatformAdmin: (id) => request(`/admin/platform-admins/${id}/enable`, { method: 'POST' }),
}

// ---------- Org users (owner/admin/staff) ----------

export async function orgLogin(email, password) {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)
  const data = await request('/auth/login', { method: 'POST', body }, USER_TOKEN_KEY, '/org/login')
  setUserToken(data.access_token)
  return data
}

const asUser = (path, options = {}) => request(path, options, USER_TOKEN_KEY, '/org/login')

export const orgApi = {
  // OAuth2 provider (Sign in with Events360, for downstream apps)
  oauthAuthorize: (clientId, redirectUri, scope, state) =>
    asUser('/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, scope, state }),
    }),

  // Events
  listEvents: (orgId) => asUser(`/organizations/${orgId}/events`),
  createEvent: (orgId, payload) =>
    asUser(`/organizations/${orgId}/events`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteEvent: (orgId, eventId) =>
    asUser(`/organizations/${orgId}/events/${eventId}`, { method: 'DELETE' }),
  updateEventRetention: (orgId, eventId, retentionDays) =>
    asUser(`/organizations/${orgId}/events/${eventId}/retention`, {
      method: 'PATCH',
      body: JSON.stringify({ retention_days: retentionDays }),
    }),

  // Roles / permissions
  listPermissionCatalog: () => asUser('/permissions'),
  listRoles: (orgId) => asUser(`/organizations/${orgId}/roles`),
  createRole: (orgId, payload) =>
    asUser(`/organizations/${orgId}/roles`, { method: 'POST', body: JSON.stringify(payload) }),

  // People
  listUsers: (orgId) => asUser(`/organizations/${orgId}/users`),
  createUser: (orgId, payload) =>
    asUser(`/organizations/${orgId}/users`, { method: 'POST', body: JSON.stringify(payload) }),
  reactivateUser: (orgId, userId) =>
    asUser(`/organizations/${orgId}/users/${userId}/reactivate`, { method: 'POST' }),

  // Staff assignments
  listStaffAssignments: (orgId) => asUser(`/organizations/${orgId}/staff-assignments`),
  createStaffAssignment: (orgId, payload) =>
    asUser(`/organizations/${orgId}/staff-assignments`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteStaffAssignment: (orgId, assignmentId) =>
    asUser(`/organizations/${orgId}/staff-assignments/${assignmentId}`, { method: 'DELETE' }),

  // Org itself
  deleteOrg: (orgId) => asUser(`/organizations/${orgId}`, { method: 'DELETE' }),
}
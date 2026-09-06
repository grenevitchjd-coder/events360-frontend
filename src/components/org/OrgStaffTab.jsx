// events360-frontend/src/components/org/OrgStaffTab.jsx
import { useEffect, useState } from 'react'
import { orgApi, getCurrentOrgUserClaims } from '../../api'
import StatusPill from '../StatusPill'

export default function OrgStaffTab({ onToast }) {
  const orgId = getCurrentOrgUserClaims()?.org_id
  const isOwner = getCurrentOrgUserClaims()?.role === 'org_owner'

  const [users, setUsers] = useState(null)
  const [roles, setRoles] = useState(null)
  const [events, setEvents] = useState(null)
  const [assignments, setAssignments] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'staff' })
  const [creatingUser, setCreatingUser] = useState(false)

  const [assignUserId, setAssignUserId] = useState('')
  const [assignPicks, setAssignPicks] = useState({})
  const [creatingAssignment, setCreatingAssignment] = useState(false)

  const loadAll = () => {
    Promise.all([
      orgApi.listUsers(orgId),
      orgApi.listRoles(orgId),
      orgApi.listEvents(orgId),
      orgApi.listStaffAssignments(orgId),
    ])
      .then(([u, r, e, a]) => {
        setUsers(u)
        setRoles(r)
        setEvents(e)
        setAssignments(a)
      })
      .catch((err) => onToast(err.message, true))
  }

  useEffect(loadAll, [orgId])

  // Apps derived from each role's permission categories (same source that
  // drives the sidebar's per-app role pages): "Events360" renders as
  // "Org role", every other category as "<App> role" — a future app's
  // roles grow a row here with zero code changes. A hybrid role appears
  // under every app it touches.
  const roleApps = (role) => [...new Set((role.permissions || []).map((p) => p.category))]
  const apps = [...new Set((roles || []).flatMap(roleApps))].sort((a, b) =>
    a === 'Events360' ? -1 : b === 'Events360' ? 1 : a.localeCompare(b)
  )
  const appRoleLabel = (app) => (app === 'Events360' ? 'Org role' : `${app} role`)
  const rolesForApp = (app) => (roles || []).filter((r) => roleApps(r).includes(app))

  const setPick = (setter) => (app, field, value) =>
    setter((prev) => ({ ...prev, [app]: { role_id: '', event_id: '', ...prev[app], [field]: value } }))

  // One assignment per picked app row; report each failure honestly.
  const createPickedAssignments = async (userId, picks) => {
    const chosen = Object.entries(picks).filter(([, p]) => p.role_id)
    let ok = 0
    for (const [app, p] of chosen) {
      try {
        await orgApi.createStaffAssignment(orgId, {
          user_id: userId,
          role_id: p.role_id,
          event_id: p.event_id || null,
        })
        ok += 1
      } catch (err) {
        onToast(`${appRoleLabel(app)} could not be assigned: ${err.message}`, true)
      }
    }
    return { ok, chosen: chosen.length }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreatingUser(true)
    try {
      const created = await orgApi.createUser(orgId, userForm)
      onToast(`${created.name} added — invite email sent so they can set their password. Give them roles below.`)
      onToast(`${userForm.name} added`)
      setUserForm({ name: '', email: '', role: 'staff' })
      loadAll()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreatingUser(false)
    }
  }

  const handleSendReset = (user) => {
    setBusyId(user.id)
    orgApi
      .sendUserReset(orgId, user.id)
      .then((res) => onToast(res.detail))
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const myId = getCurrentOrgUserClaims()?.sub

  // Mirror of the server's guards, so buttons users can't use don't render:
  // never yourself, never the owner, and admins are owner-only targets.
  const canActOn = (user) =>
    user.id !== myId &&
    user.role !== 'org_owner' &&
    (user.role !== 'org_admin' || isOwner)

  const handleDeactivate = (user) => {
    setBusyId(user.id)
    orgApi
      .deactivateUser(orgId, user.id)
      .then(() => {
        onToast(`${user.name} deactivated — they can no longer sign in`)
        loadAll()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const handleDelete = (user) => {
    if (!window.confirm(`Remove ${user.name} from the organization? Their role assignments go with them. This can't be undone.`)) return
    setBusyId(user.id)
    orgApi
      .deleteUser(orgId, user.id)
      .then(() => {
        onToast(`${user.name} removed from the organization`)
        loadAll()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const handleReactivate = (user) => {
    setBusyId(user.id)
    orgApi
      .reactivateUser(orgId, user.id)
      .then(() => {
        onToast(`${user.name} reactivated`)
        loadAll()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    const anyPicked = Object.values(assignPicks).some((p) => p.role_id)
    if (!assignUserId || !anyPicked) {
      onToast('Pick a person and at least one role.', true)
      return
    }
    setCreatingAssignment(true)
    try {
      const { ok, chosen } = await createPickedAssignments(assignUserId, assignPicks)
      if (ok > 0) onToast(`${ok}/${chosen} role${chosen === 1 ? '' : 's'} assigned`)
      setAssignUserId('')
      setAssignPicks({})
      loadAll()
    } finally {
      setCreatingAssignment(false)
    }
  }

  // One row per app: "<App> role" dropdown + its scope. Used by both the
  // Add-a-person form and Assign roles below.
  const renderAppPicks = (picks, setPicks, idPrefix) =>
    apps.map((appName) => (
      <div key={appName} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div className="field">
          <label htmlFor={`${idPrefix}-${appName}-role`}>{appRoleLabel(appName)}</label>
          <select
            id={`${idPrefix}-${appName}-role`}
            value={picks[appName]?.role_id || ''}
            onChange={(e) => setPick(setPicks)(appName, 'role_id', e.target.value)}
            style={selectStyle}
          >
            <option value="">— none —</option>
            {rolesForApp(appName).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-${appName}-scope`}>Scope</label>
          <select
            id={`${idPrefix}-${appName}-scope`}
            value={picks[appName]?.event_id || ''}
            onChange={(e) => setPick(setPicks)(appName, 'event_id', e.target.value)}
            disabled={!picks[appName]?.role_id}
            style={selectStyle}
          >
            <option value="">Org-wide</option>
            {(events || []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} only
              </option>
            ))}
          </select>
        </div>
      </div>
    ))

  // Inline editing of an assignment (role and/or scope) — Edit turns the
  // row's Role and Scope cells into dropdowns; Save patches in place.
  const [editingAsgId, setEditingAsgId] = useState(null)
  const [editAsg, setEditAsg] = useState({ role_id: '', event_id: '' })

  const startEditAssignment = (a) => {
    setEditingAsgId(a.id)
    setEditAsg({ role_id: a.role_id, event_id: a.event_id || '' })
  }

  const handleSaveAssignment = (a) => {
    setBusyId(a.id)
    orgApi
      .updateStaffAssignment(orgId, a.id, {
        role_id: editAsg.role_id,
        event_id: editAsg.event_id || null,
      })
      .then(() => {
        onToast('Assignment updated')
        setEditingAsgId(null)
        loadAll()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const handleRemoveAssignment = (assignment) => {
    setBusyId(assignment.id)
    orgApi
      .deleteStaffAssignment(orgId, assignment.id)
      .then(() => {
        onToast('Assignment removed')
        loadAll()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  if (!users || !roles || !events || !assignments) return null

  const userName = (id) => users.find((u) => u.id === id)?.name || 'unknown'
  const roleName = (id) => roles.find((r) => r.id === id)?.name || 'unknown'
  const eventName = (id) => (id ? events.find((e) => e.id === id)?.name || 'unknown' : null)

  const selectStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: '14px',
  }

  return (
    <>
      <div className="page-title">Staff</div>
      <p className="page-subtitle">Add people to your organization and assign them roles.</p>

      <div className="panel">
        <div className="panel-title">Add a person</div>
        <form className="inline-form" onSubmit={handleCreateUser}>
          <div className="field">
            <label htmlFor="u-name">Name</label>
            <input
              id="u-name"
              required
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input
              id="u-email"
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="u-role">Role</label>
            <select
              id="u-role"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              style={selectStyle}
            >
              <option value="staff">Staff</option>
              {isOwner && <option value="org_admin">Org admin</option>}
            </select>
          </div>
          <button className="btn btn-secondary" type="submit" disabled={creatingUser}>
            Add person
          </button>
        </form>
        <p className="page-subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
          No password to type: they&apos;ll get an invite email with a link to set their own.
          Then give them access in Assign roles below.
        </p>
      </div>

      <table className="data-table" style={{ marginBottom: 28 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td className="mono">{user.email}</td>
              <td className="mono">{user.role}</td>
              <td>
                <StatusPill status={user.status} />
              </td>
              <td className="actions-cell">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={busyId === user.id}
                  onClick={() => handleSendReset(user)}
                >
                  Send reset link
                </button>
                {user.status === 'inactive' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === user.id}
                    onClick={() => handleReactivate(user)}
                  >
                    Reactivate
                  </button>
                )}
                {user.status === 'active' && canActOn(user) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === user.id}
                    onClick={() => handleDeactivate(user)}
                  >
                    Deactivate
                  </button>
                )}
                {canActOn(user) && (
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === user.id}
                    onClick={() => handleDelete(user)}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="panel">
        <div className="panel-title">Assign roles</div>
        <form className="inline-form" onSubmit={handleCreateAssignment}>
          <div className="field">
            <label htmlFor="a-user">Person</label>
            <select
              id="a-user"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              style={selectStyle}
            >
              <option value="" disabled>
                Choose…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          {renderAppPicks(assignPicks, setAssignPicks, 'a')}
          <button className="btn btn-secondary" type="submit" disabled={creatingAssignment}>
            Assign
          </button>
        </form>
      </div>

      {assignments.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">No role assignments yet.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Scope</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) =>
              editingAsgId === a.id ? (
                <tr key={a.id}>
                  <td>{userName(a.user_id)}</td>
                  <td>
                    <select
                      aria-label="Edit role"
                      value={editAsg.role_id}
                      onChange={(e) => setEditAsg({ ...editAsg, role_id: e.target.value })}
                      style={selectStyle}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="Edit scope"
                      value={editAsg.event_id}
                      onChange={(e) => setEditAsg({ ...editAsg, event_id: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="">Org-wide</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} only
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === a.id}
                      onClick={() => handleSaveAssignment(a)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === a.id}
                      onClick={() => setEditingAsgId(null)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td>{userName(a.user_id)}</td>
                  <td>{roleName(a.role_id)}</td>
                  <td className="mono">{a.event_id ? eventName(a.event_id) : 'Org-wide'}</td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === a.id}
                      onClick={() => startEditAssignment(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={busyId === a.id}
                      onClick={() => handleRemoveAssignment(a)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </>
  )
}
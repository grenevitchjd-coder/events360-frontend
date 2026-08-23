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

  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [creatingUser, setCreatingUser] = useState(false)

  const [assignForm, setAssignForm] = useState({ user_id: '', role_id: '', event_id: '' })
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

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreatingUser(true)
    try {
      await orgApi.createUser(orgId, userForm)
      onToast(`${userForm.name} added`)
      setUserForm({ name: '', email: '', password: '', role: 'staff' })
      loadAll()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreatingUser(false)
    }
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
    setCreatingAssignment(true)
    try {
      await orgApi.createStaffAssignment(orgId, {
        user_id: assignForm.user_id,
        role_id: assignForm.role_id,
        event_id: assignForm.event_id || null,
      })
      onToast('Assignment created')
      setAssignForm({ user_id: '', role_id: '', event_id: '' })
      loadAll()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreatingAssignment(false)
    }
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
            <label htmlFor="u-password">Password</label>
            <input
              id="u-password"
              type="password"
              required
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
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
                {user.status === 'inactive' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === user.id}
                    onClick={() => handleReactivate(user)}
                  >
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="panel">
        <div className="panel-title">Assign a role</div>
        <form className="inline-form" onSubmit={handleCreateAssignment}>
          <div className="field">
            <label htmlFor="a-user">Person</label>
            <select
              id="a-user"
              required
              value={assignForm.user_id}
              onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
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
          <div className="field">
            <label htmlFor="a-role">Role</label>
            <select
              id="a-role"
              required
              value={assignForm.role_id}
              onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
              style={selectStyle}
            >
              <option value="" disabled>
                Choose…
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="a-event">Scope</label>
            <select
              id="a-event"
              value={assignForm.event_id}
              onChange={(e) => setAssignForm({ ...assignForm, event_id: e.target.value })}
              style={selectStyle}
            >
              <option value="">Org-wide</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} only
                </option>
              ))}
            </select>
          </div>
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
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{userName(a.user_id)}</td>
                <td>{roleName(a.role_id)}</td>
                <td className="mono">{a.event_id ? eventName(a.event_id) : 'Org-wide'}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === a.id}
                    onClick={() => handleRemoveAssignment(a)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
import { useEffect, useState } from 'react'
import { api, getCurrentAdminClaims } from '../api'
import StatusPill from './StatusPill'

export default function PlatformAdmins({ onToast }) {
  const [admins, setAdmins] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support_admin' })
  const [creating, setCreating] = useState(false)

  const claims = getCurrentAdminClaims()
  const isSuperadmin = claims?.role === 'superadmin'
  const myId = claims?.sub

  const load = () => {
    api
      .listPlatformAdmins()
      .then(setAdmins)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.createPlatformAdmin(form)
      onToast(`${form.name} added as ${form.role.replace('_', ' ')}`)
      setForm({ name: '', email: '', password: '', role: 'support_admin' })
      load()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreating(false)
    }
  }

  const toggleStatus = async (admin) => {
    setBusyId(admin.id)
    try {
      if (admin.status === 'active') {
        await api.disablePlatformAdmin(admin.id)
        onToast(`${admin.name} disabled`)
      } else {
        await api.enablePlatformAdmin(admin.id)
        onToast(`${admin.name} re-enabled`)
      }
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  if (admins === null) return null

  return (
    <>
      <div className="page-title">Platform admins</div>
      <p className="page-subtitle">Superadmins and support admins with access to this control panel.</p>

      {isSuperadmin && (
        <div className="panel">
          <div className="panel-title">Add a platform admin</div>
          <form className="inline-form" onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: 'var(--text)',
                  fontSize: '14px',
                }}
              >
                <option value="support_admin">Support admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <button className="btn btn-secondary" type="submit" disabled={creating}>
              Add admin
            </button>
          </form>
        </div>
      )}

      <table className="data-table">
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
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.name}</td>
              <td className="mono">{admin.email}</td>
              <td className="mono">{admin.role}</td>
              <td>
                <StatusPill status={admin.status} />
              </td>
              <td className="actions-cell">
                {isSuperadmin && admin.id !== myId && (
                  <button
                    className={admin.status === 'active' ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
                    disabled={busyId === admin.id}
                    onClick={() => toggleStatus(admin)}
                  >
                    {admin.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
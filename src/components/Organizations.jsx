import { useEffect, useState } from 'react'
import { api } from '../api'
import StatusPill from './StatusPill'

export default function Organizations({ onToast }) {
  const [orgs, setOrgs] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    api
      .listAllOrgs()
      .then(setOrgs)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [])

  const run = async (org, action, label) => {
    setBusyId(org.id)
    try {
      await action()
      onToast(`${org.name} ${label}`)
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = (org) => {
    if (!window.confirm(`Delete "${org.name}" and all its data? This can't be undone.`)) return
    run(org, () => api.deleteOrg(org.id), 'deleted')
  }

  if (orgs === null) return null

  return (
    <>
      <div className="page-title">Organizations</div>
      <p className="page-subtitle">Every organization on the platform, regardless of status.</p>

      {orgs.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">No organizations yet.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Owner</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td className="mono">{org.owner_email}</td>
                <td>
                  <StatusPill status={org.status} />
                </td>
                <td className="actions-cell">
                  {org.status === 'active' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === org.id}
                      onClick={() => run(org, () => api.lockOrg(org.id), 'locked')}
                    >
                      Lock
                    </button>
                  )}
                  {org.status === 'locked' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === org.id}
                      onClick={() => run(org, () => api.unlockOrg(org.id), 'unlocked')}
                    >
                      Unlock
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === org.id}
                    onClick={() => handleDelete(org)}
                  >
                    Delete
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
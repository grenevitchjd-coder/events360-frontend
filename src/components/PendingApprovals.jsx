import { useEffect, useState } from 'react'
import { api } from '../api'
import StatusPill from './StatusPill'

export default function PendingApprovals({ onToast }) {
  const [orgs, setOrgs] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    api
      .listPendingOrgs()
      .then(setOrgs)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [])

  const handleApprove = async (org) => {
    setBusyId(org.id)
    try {
      await api.approveOrg(org.id)
      onToast(`${org.name} approved`)
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  const handleDeny = async (org) => {
    setBusyId(org.id)
    try {
      await api.denyOrg(org.id)
      onToast(`${org.name} denied`)
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  if (orgs === null) return null

  return (
    <>
      <div className="page-title">Pending approvals</div>
      <p className="page-subtitle">New organizations waiting for review before they can access the platform.</p>

      {orgs.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">Nothing waiting on review right now.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Owner</th>
              <th>Requested</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td className="mono">{org.owner_email}</td>
                <td className="mono">{new Date(org.created_at).toLocaleDateString()}</td>
                <td>
                  <StatusPill status={org.status} />
                </td>
                <td className="actions-cell">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === org.id}
                    onClick={() => handleApprove(org)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === org.id}
                    onClick={() => handleDeny(org)}
                  >
                    Deny
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
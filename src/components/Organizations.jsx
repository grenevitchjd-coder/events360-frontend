// events360-frontend/src/components/Organizations.jsx
import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import StatusPill from './StatusPill'

function ProductsPanel({ org, onToast }) {
  const [entitlements, setEntitlements] = useState(null)
  const [busyKey, setBusyKey] = useState(null)

  const load = () => {
    api
      .listOrgEntitlements(org.id)
      .then(setEntitlements)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [org.id])

  const toggle = async (ent) => {
    setBusyKey(ent.product_key)
    try {
      if (ent.enabled) {
        await api.disableEntitlement(org.id, ent.product_key)
        onToast(`${ent.name} disabled for ${org.name}`)
      } else {
        await api.enableEntitlement(org.id, ent.product_key)
        onToast(`${ent.name} enabled for ${org.name}`)
      }
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyKey(null)
    }
  }

  if (entitlements === null) return <div className="events-panel-empty">Loading products…</div>

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {entitlements.map((ent) => (
        <button
          key={ent.product_key}
          className={ent.enabled ? 'btn btn-secondary btn-sm' : 'btn btn-danger btn-sm'}
          disabled={busyKey === ent.product_key}
          onClick={() => toggle(ent)}
        >
          {ent.name}: {ent.enabled ? 'Enabled' : 'Disabled'} — tap to {ent.enabled ? 'disable' : 'enable'}
        </button>
      ))}
    </div>
  )
}

export default function Organizations({ onToast }) {
  const [orgs, setOrgs] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

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

  const toggleExpanded = (orgId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(orgId)) next.delete(orgId)
      else next.add(orgId)
      return next
    })
  }

  const filteredOrgs = useMemo(() => {
    if (!orgs) return null
    const q = search.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.owner_name.toLowerCase().includes(q) ||
        org.owner_email.toLowerCase().includes(q)
    )
  }, [orgs, search])

  if (orgs === null) return null

  return (
    <>
      <div className="section-header">
        <div>
          <div className="page-title">Organizations</div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Every organization on the platform. Click a row to manage which apps it can use.
          </p>
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Search by org, owner, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredOrgs.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">
            {orgs.length === 0 ? 'No organizations yet.' : 'No organizations match your search.'}
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Organization</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.map((org) => {
              const isOpen = expanded.has(org.id)
              return (
                <Fragment key={org.id}>
                  <tr className="org-row" onClick={() => toggleExpanded(org.id)}>
                    <td style={{ width: 32 }}>
                      <span className={`expand-toggle ${isOpen ? 'open' : ''}`} aria-hidden="true">
                        ▶
                      </span>
                    </td>
                    <td>{org.name}</td>
                    <td>{org.owner_name}</td>
                    <td className="mono">{org.owner_email}</td>
                    <td>
                      <StatusPill status={org.status} />
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
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
                  {isOpen && (
                    <tr className="events-panel-row">
                      <td colSpan={6}>
                        <div className="events-panel">
                          <div
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: 12,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              marginBottom: 6,
                            }}
                          >
                            Apps
                          </div>
                          <ProductsPanel org={org} onToast={onToast} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
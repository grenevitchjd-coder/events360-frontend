import { useEffect, useMemo, useState } from 'react'
import { orgApi, getCurrentOrgUserClaims } from '../../api'

function groupByCategory(catalog) {
  const groups = {}
  for (const perm of catalog) {
    if (!groups[perm.category]) groups[perm.category] = []
    groups[perm.category].push(perm)
  }
  return groups
}

export default function OrgRolesTab({ onToast }) {
  const orgId = getCurrentOrgUserClaims()?.org_id
  const [roles, setRoles] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [name, setName] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [creating, setCreating] = useState(false)

  const load = () => {
    orgApi
      .listRoles(orgId)
      .then(setRoles)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(() => {
    load()
    orgApi
      .listPermissionCatalog()
      .then(setCatalog)
      .catch((e) => onToast(e.message, true))
  }, [orgId])

  const groupedCatalog = useMemo(() => (catalog ? groupByCategory(catalog) : {}), [catalog])

  const togglePermission = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (selectedKeys.size === 0) {
      onToast('Pick at least one permission for this role.', true)
      return
    }
    setCreating(true)
    try {
      await orgApi.createRole(orgId, { name, permission_keys: Array.from(selectedKeys) })
      onToast(`Role "${name}" created`)
      setName('')
      setSelectedKeys(new Set())
      load()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreating(false)
    }
  }

  if (roles === null || catalog === null) return null

  return (
    <>
      <div className="page-title">Roles</div>
      <p className="page-subtitle">Build custom roles by combining permissions, then assign them to staff.</p>

      <div className="panel">
        <div className="panel-title">Create a role</div>
        <form onSubmit={handleCreate}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="role-name">Role name</label>
            <input id="role-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label>Permissions</label>
            <div className="permission-groups">
              {Object.entries(groupedCatalog).map(([category, perms]) => (
                <div key={category}>
                  <div className="permission-group-title">{category}</div>
                  <div className="permission-list">
                    {perms.map((perm) => (
                      <label key={perm.key} className="permission-item">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                        />
                        <span className="permission-item-text">
                          <span className="permission-item-key">{perm.key}</span>
                          <span className="permission-item-desc">{perm.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-secondary" type="submit" disabled={creating} style={{ marginTop: 20 }}>
            Create role
          </button>
        </form>
      </div>

      {roles.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">No custom roles yet — create one above.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {role.permissions.map((p) => (
                    <span key={p.id} className="mono" style={{ fontSize: 12 }}>
                      {p.key}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
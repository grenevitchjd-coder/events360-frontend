// events360-frontend/src/components/org/OrgRolesTab.jsx
import { useEffect, useMemo, useState } from 'react'
import { orgApi, getCurrentOrgUserClaims } from '../../api'

// Human names for the areas encoded in permission keys ("<app>.<area>.<action>").
const AREA_LABELS = {
  setup: 'Event setup',
  guests: 'Guests (Invites & Allotments)',
  guest_list: 'Guest list',
  promotion: 'Promotion',
  money: 'Money',
  checkin: 'Check-in',
  events: 'Events',
  staff: 'Staff & assignments',
}

// Tab titles per catalog category. "Events360" is the org control plane —
// grants there let staff run the org (people, events) WITHOUT the
// org_admin implicit-everything, so an org manager never has to be given
// app financials just to manage the team. Unknown categories (future
// apps) fall back to "<Category> roles" automatically.
const CATEGORY_TAB_LABELS = {
  Events360: 'Org roles',
  EventNXT: 'EventNXT roles',
}
const tabLabelFor = (category) => CATEGORY_TAB_LABELS[category] || `${category} roles`

// Starter roles: clicking one prefills the builder (name + permissions) so
// the admin can see exactly what it grants, tweak it, and save. Manage keys
// bring their view keys along, matching the manage-implies-view rule.
const TEMPLATES = [
  {
    name: 'Org manager',
    app: 'Events360',
    blurb: 'Runs the org — people, assignments, events — with zero app financials.',
    keys: [
      'events360.staff.manage', 'events360.staff.view',
      'events360.events.manage', 'events360.events.view',
    ],
  },
  {
    name: 'Door staff',
    app: 'EventNXT',
    blurb: 'Check people in and see the roster. Nothing else.',
    keys: ['eventnxt.checkin', 'eventnxt.guest_list.view'],
  },
  {
    name: 'Guest manager',
    app: 'EventNXT',
    blurb: 'Runs invites, allotments, and the guest list. Sees setup, no money.',
    keys: [
      'eventnxt.guests.manage', 'eventnxt.guests.view',
      'eventnxt.guest_list.manage', 'eventnxt.guest_list.view',
      'eventnxt.setup.view', 'eventnxt.checkin',
    ],
  },
  {
    name: 'Promoter',
    app: 'EventNXT',
    blurb: 'Creates promo codes and referral deals. No sales figures.',
    keys: ['eventnxt.promotion.manage', 'eventnxt.promotion.view'],
  },
  {
    name: 'Finance',
    app: 'EventNXT',
    blurb: 'Full money access — refunds, payouts, reserve — plus view of everything.',
    keys: [
      'eventnxt.money.manage', 'eventnxt.money.view',
      'eventnxt.setup.view', 'eventnxt.guests.view',
      'eventnxt.guest_list.view', 'eventnxt.promotion.view',
    ],
  },
  {
    name: 'Event coordinator',
    app: 'EventNXT',
    blurb: 'Runs everything except acting on money (can see the numbers).',
    keys: [
      'eventnxt.setup.manage', 'eventnxt.setup.view',
      'eventnxt.guests.manage', 'eventnxt.guests.view',
      'eventnxt.guest_list.manage', 'eventnxt.guest_list.view',
      'eventnxt.promotion.manage', 'eventnxt.promotion.view',
      'eventnxt.money.view', 'eventnxt.checkin',
    ],
  },
]

// Parse the flat catalog into: app -> [ { area, label, view?, manage?, single? } ]
function structureCatalog(catalog) {
  const apps = {}
  for (const perm of catalog) {
    const parts = perm.key.split('.')
    const app = perm.category
    if (!apps[app]) apps[app] = {}
    const areaKey = parts.length >= 2 ? parts[1] : perm.key
    if (!apps[app][areaKey]) {
      apps[app][areaKey] = { area: areaKey, label: AREA_LABELS[areaKey] || areaKey }
    }
    const action = parts.length >= 3 ? parts[2] : 'single'
    apps[app][areaKey][action] = perm
  }
  return Object.fromEntries(
    Object.entries(apps).map(([app, areas]) => [app, Object.values(areas)])
  )
}

// Compact human summary of a role's grants: "Guests: manage · Check-in"
function summarize(role) {
  const byArea = {}
  for (const p of role.permissions) {
    const parts = p.key.split('.')
    const area = parts.length >= 2 ? parts[1] : p.key
    const action = parts.length >= 3 ? parts[2] : 'yes'
    if (action === 'manage' || !byArea[area]) byArea[area] = action
  }
  return Object.entries(byArea)
    .map(([area, action]) => {
      const label = AREA_LABELS[area] || area
      return action === 'yes' ? label : `${label}: ${action}`
    })
    .join(' · ')
}

export default function OrgRolesTab({ onToast }) {
  const orgId = getCurrentOrgUserClaims()?.org_id
  const [roles, setRoles] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [name, setName] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

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

  const structured = useMemo(() => (catalog ? structureCatalog(catalog) : {}), [catalog])
  const categories = useMemo(() => {
    const cats = Object.keys(structured)
    // Org control plane first, then apps alphabetically
    return cats.sort((a, b) => (a === 'Events360' ? -1 : b === 'Events360' ? 1 : a.localeCompare(b)))
  }, [structured])
  const [activeApp, setActiveApp] = useState(null)
  const currentApp = activeApp && categories.includes(activeApp) ? activeApp : categories[0]
  const keyCategory = useMemo(
    () => Object.fromEntries((catalog || []).map((p) => [p.key, p.category])),
    [catalog]
  )
  const roleTouchesApp = (role, app) => role.permissions.some((p) => keyCategory[p.key] === app)

  const setChecked = (key, on) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  // Manage implies view: turning manage on brings view with it; while manage
  // is on, the view box is locked on (no "can edit but not see" roles).
  const toggleManage = (row) => {
    const on = !selectedKeys.has(row.manage.key)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (on) {
        next.add(row.manage.key)
        if (row.view) next.add(row.view.key)
      } else {
        next.delete(row.manage.key)
      }
      return next
    })
  }

  const applyTemplate = (template) => {
    setEditingRoleId(null)
    setName(template.name)
    setSelectedKeys(new Set(template.keys))
  }

  const startEdit = (role) => {
    if (!roleTouchesApp(role, currentApp)) {
      const home = categories.find((c) => roleTouchesApp(role, c))
      if (home) setActiveApp(home)
    }
    setEditingRoleId(role.id)
    setName(role.name)
    setSelectedKeys(new Set(role.permissions.map((p) => p.key)))
  }

  const resetBuilder = () => {
    setEditingRoleId(null)
    setName('')
    setSelectedKeys(new Set())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedKeys.size === 0) {
      onToast('Pick at least one permission for this role.', true)
      return
    }
    setSaving(true)
    try {
      // Editing under one app tab must never silently strip grants the
      // role holds in OTHER apps — carry those along untouched.
      const keys = new Set(selectedKeys)
      if (editingRoleId) {
        const editing = roles.find((r) => r.id === editingRoleId)
        for (const p of editing?.permissions || []) {
          if (keyCategory[p.key] !== currentApp) keys.add(p.key)
        }
      }
      const payload = { name, permission_keys: Array.from(keys) }
      if (editingRoleId) {
        await orgApi.updateRole(orgId, editingRoleId, payload)
        onToast(`Role "${name}" updated — everyone assigned it has the new access now`)
      } else {
        await orgApi.createRole(orgId, payload)
        onToast(`Role "${name}" created`)
      }
      resetBuilder()
      load()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (role) => {
    if (!window.confirm(`Delete the role "${role.name}"?`)) return
    setBusyId(role.id)
    orgApi
      .deleteRole(orgId, role.id)
      .then(() => {
        onToast(`Role "${role.name}" deleted`)
        if (editingRoleId === role.id) resetBuilder()
        load()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  if (roles === null || catalog === null) return null

  const checkboxStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }

  return (
    <>
      <div className="page-title">Roles</div>
      <p className="page-subtitle">
        A role is a bundle of access you assign to staff on the Staff tab — org-wide or for one
        event. Owners and org admins always have full access; roles only apply to staff. Org roles
        cover running the organization itself; each app's roles cover only that app.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn btn-sm ${currentApp === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveApp(cat)
              resetBuilder()
            }}
          >
            {tabLabelFor(cat)}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">Start from a template</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0 }}>
          Picking one fills in the builder below so you can see and adjust exactly what it grants
          before saving.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TEMPLATES.filter((t) => t.app === currentApp).map((t) => (
            <button
              key={t.name}
              type="button"
              className="btn btn-secondary btn-sm"
              title={t.blurb}
              onClick={() => applyTemplate(t)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{editingRoleId ? `Edit role` : 'Build a role'}</div>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="role-name">Role name</label>
            <input id="role-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {Object.entries(structured).filter(([app]) => app === currentApp).map(([app, rows]) => (
            <div key={app} style={{ marginTop: 12 }}>
              <div className="permission-group-title">{app}</div>
              <table className="data-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Area</th>
                    <th style={{ width: 90 }}>View</th>
                    <th style={{ width: 90 }}>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.area}>
                      <td>
                        <div>{row.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {(row.view || row.single)?.description}
                        </div>
                      </td>
                      {row.single ? (
                        <td colSpan={2}>
                          <label style={checkboxStyle}>
                            <input
                              type="checkbox"
                              aria-label={`${row.label} allowed`}
                              checked={selectedKeys.has(row.single.key)}
                              onChange={(e) => setChecked(row.single.key, e.target.checked)}
                            />
                            Allowed
                          </label>
                        </td>
                      ) : (
                        <>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`${row.label} view`}
                              checked={selectedKeys.has(row.view.key)}
                              disabled={selectedKeys.has(row.manage.key)}
                              onChange={(e) => setChecked(row.view.key, e.target.checked)}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`${row.label} manage`}
                              checked={selectedKeys.has(row.manage.key)}
                              onChange={() => toggleManage(row)}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" type="submit" disabled={saving}>
              {editingRoleId ? 'Save changes' : 'Create role'}
            </button>
            {editingRoleId && (
              <button className="btn btn-secondary" type="button" onClick={resetBuilder}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {roles.filter((r) => roleTouchesApp(r, currentApp)).length === 0 ? (
        <div className="data-table">
          <div className="empty-state">No {tabLabelFor(currentApp).toLowerCase()} yet — start from a template above.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.filter((r) => roleTouchesApp(r, currentApp)).map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td style={{ fontSize: 13 }}>{summarize(role) || '—'}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === role.id}
                    onClick={() => startEdit(role)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === role.id}
                    onClick={() => handleDelete(role)}
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
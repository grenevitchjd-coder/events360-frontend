// events360-frontend/src/pages/OrgDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearUserToken, getCurrentOrgUserClaims, orgApi } from '../api'
import OrgAppsTab from '../components/org/OrgAppsTab'
import OrgEventsTab from '../components/org/OrgEventsTab'
import OrgStaffTab from '../components/org/OrgStaffTab'
import OrgRolesTab from '../components/org/OrgRolesTab'
import OrgSettingsTab from '../components/org/OrgSettingsTab'

// Sidebar labels for role pages, per catalog category. Unknown future
// categories fall back to "<Category> roles" automatically.
const ROLE_TAB_LABELS = { Events360: 'Org roles', EventNXT: 'EventNXT roles' }
const roleTabLabel = (cat) => ROLE_TAB_LABELS[cat] || `${cat} roles`

const TABS = [
  { key: 'apps', label: 'Apps' },
  { key: 'events', label: 'Events' },
  { key: 'staff', label: 'Staff' },
  { key: 'settings', label: 'Settings' },
]

export default function OrgDashboard() {
  const [tab, setTab] = useState('apps')
  const [toast, setToast] = useState(null)
  const [me, setMe] = useState(null)
  const navigate = useNavigate()
  const claims = getCurrentOrgUserClaims()

  const [roleCategories, setRoleCategories] = useState([])

  useEffect(() => {
    orgApi.getMe().then(setMe).catch(() => {})
    // One sidebar item per app category in the permission catalog —
    // "Org roles" (Events360) first, then apps alphabetically. A new
    // app's keys appearing in the catalog grows the sidebar by itself.
    orgApi
      .listPermissionCatalog()
      .then((cat) => {
        const cats = [...new Set(cat.map((p) => p.category))]
        cats.sort((a, b) => (a === 'Events360' ? -1 : b === 'Events360' ? 1 : a.localeCompare(b)))
        setRoleCategories(cats)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tab gating from /auth/me (same grants the backend enforces). Apps is
  // always available; Events/Staff open to staff holding the events360
  // area; Roles and Settings stay owner/admin-only (a role that edits
  // roles could grant itself anything). A missing payload (loading, or an
  // older backend) gates nothing.
  const hasOrgArea = (area) => {
    const perms = me?.permissions
    if (!me || !perms || perms.all) return true
    const all = [...(perms.org_wide || []), ...Object.values(perms.by_event || {}).flat()]
    return all.some((k) => k.startsWith(`events360.${area}.`))
  }
  const tabAllowed = (key) => {
    if (key === 'apps') return true
    if (key === 'events') return hasOrgArea('events')
    if (key === 'staff') return hasOrgArea('staff')
    // role pages + settings: owner/admin only
    return !me || !me.permissions || me.permissions.all
  }

  // Static tabs with the per-app role pages spliced in before Settings.
  const navTabs = [
    ...TABS.filter((t) => t.key !== 'settings'),
    ...roleCategories.map((cat) => ({ key: `roles:${cat}`, label: roleTabLabel(cat) })),
    ...TABS.filter((t) => t.key === 'settings'),
  ]

  useEffect(() => {
    if (me && !tabAllowed(tab)) setTab('apps')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, tab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message, isError = false) => setToast({ message, isError })

  const handleLogout = () => {
    clearUserToken()
    navigate('/org/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" />
          Events360
        </div>
        {navTabs.map((t) => (
          <button
            key={t.key}
            className={`nav-item ${tab === t.key ? 'active' : ''}`}
            disabled={!tabAllowed(t.key)}
            title={tabAllowed(t.key) ? undefined : 'Your role doesn\u2019t include this'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="sidebar-footer">
          <div className="sidebar-user">{claims?.role || 'user'}</div>
          <button className="nav-item" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        {tab === 'apps' && <OrgAppsTab onToast={showToast} />}
        {tab === 'events' && <OrgEventsTab onToast={showToast} />}
        {tab === 'staff' && <OrgStaffTab onToast={showToast} />}
        {tab.startsWith('roles:') && (
          <OrgRolesTab
            key={tab}
            app={tab.slice('roles:'.length)}
            appLabel={roleTabLabel(tab.slice('roles:'.length))}
            onToast={showToast}
          />
        )}
        {tab === 'settings' && <OrgSettingsTab onToast={showToast} />}
      </main>

      {toast && <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>{toast.message}</div>}
    </div>
  )
}
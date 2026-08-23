import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearUserToken, getCurrentOrgUserClaims } from '../api'
import OrgEventsTab from '../components/org/OrgEventsTab'
import OrgStaffTab from '../components/org/OrgStaffTab'
import OrgRolesTab from '../components/org/OrgRolesTab'
import OrgSettingsTab from '../components/org/OrgSettingsTab'

const TABS = [
  { key: 'events', label: 'Events' },
  { key: 'staff', label: 'Staff' },
  { key: 'roles', label: 'Roles' },
  { key: 'settings', label: 'Settings' },
]

export default function OrgDashboard() {
  const [tab, setTab] = useState('events')
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const claims = getCurrentOrgUserClaims()

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
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`nav-item ${tab === t.key ? 'active' : ''}`}
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
        {tab === 'events' && <OrgEventsTab onToast={showToast} />}
        {tab === 'staff' && <OrgStaffTab onToast={showToast} />}
        {tab === 'roles' && <OrgRolesTab onToast={showToast} />}
        {tab === 'settings' && <OrgSettingsTab onToast={showToast} />}
      </main>

      {toast && <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>{toast.message}</div>}
    </div>
  )
}
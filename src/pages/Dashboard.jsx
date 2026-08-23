import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getCurrentAdminClaims } from '../api'
import PendingApprovals from '../components/PendingApprovals'
import Organizations from '../components/Organizations'
import PlatformAdmins from '../components/PlatformAdmins'

const TABS = [
  { key: 'pending', label: 'Pending approvals' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'admins', label: 'Platform admins' },
]

export default function Dashboard() {
  const [tab, setTab] = useState('pending')
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const claims = getCurrentAdminClaims()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message, isError = false) => setToast({ message, isError })

  const handleLogout = () => {
    clearToken()
    navigate('/login')
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
          <div className="sidebar-user">{claims?.role || 'admin'}</div>
          <button className="nav-item" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        {tab === 'pending' && <PendingApprovals onToast={showToast} />}
        {tab === 'organizations' && <Organizations onToast={showToast} />}
        {tab === 'admins' && <PlatformAdmins onToast={showToast} />}
      </main>

      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>{toast.message}</div>
      )}
    </div>
  )
}
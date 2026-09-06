// events360-frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrgLogin from './pages/OrgLogin'
import OrgDashboard from './pages/OrgDashboard'
import OAuthAuthorize from './pages/OAuthAuthorize'
import ResetPassword from './pages/ResetPassword'

function isAdminAuthenticated() {
  return !!localStorage.getItem('events360_admin_token')
}

function isOrgAuthenticated() {
  return !!localStorage.getItem('events360_user_token')
}

function RequireAdminAuth({ children }) {
  if (!isAdminAuthenticated()) return <Navigate to="/login" replace />
  return children
}

function RequireOrgAuth({ children }) {
  if (!isOrgAuthenticated()) return <Navigate to="/org/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Platform admin (Tito) — unchanged from before */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAdminAuth>
              <Dashboard />
            </RequireAdminAuth>
          }
        />

        {/* Org owner/admin/staff */}
        <Route path="/org/login" element={<OrgLogin />} />
        <Route
          path="/org"
          element={
            <RequireOrgAuth>
              <OrgDashboard />
            </RequireOrgAuth>
          }
        />

        {/* OAuth2 provider — "Sign in with Events360" for downstream apps */}
        <Route path="/oauth/authorize" element={<OAuthAuthorize />} />

        {/* Public: finish a password reset from an emailed link (works for
            both org users and platform admins — the token knows which) */}
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  )
}
// events360-frontend/src/pages/ResetPassword.jsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  // null until success; then "org_user" | "platform_admin" so we can link
  // back to the right sign-in page.
  const [doneAs, setDoneAs] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await resetPassword(token, password)
      setDoneAs(data.account_type)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="orbit-signature" aria-hidden="true">
        <div className="orbit-ring r1">
          <span className="orbit-dot" />
        </div>
        <div className="orbit-ring r2">
          <span className="orbit-dot d2" />
        </div>
        <div className="orbit-ring r3" />
      </div>

      <div className="login-card">
        <p className="login-eyebrow">Events360</p>
        <h1 className="login-title">Choose a new password</h1>

        {!token ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
            This page needs a reset link from your email. If yours has expired or is missing,
            ask your organization admin (or Events360 support) to send you a new one.
          </p>
        ) : doneAs ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
              Your password has been updated. You can sign in with it now.
            </p>
            <Link
              className="btn btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
              to={doneAs === 'platform_admin' ? '/login' : '/org/login'}
            >
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 0 }}>
                At least 8 characters, with 1 number and 1 special character. This link works once
                and expires 60 minutes after it was sent.
              </p>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
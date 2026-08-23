import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orgApi, getCurrentOrgUserClaims } from '../api'

/**
 * Non-visual redirect handler for "Sign in with Events360," landed on by
 * downstream apps (EventNXT, etc.) redirecting the browser here with
 * client_id/redirect_uri/scope/state query params.
 *
 * If the org user isn't logged in, stashes the pending OAuth params and
 * sends them to /org/login first — OrgLogin picks the pending redirect
 * back up after a successful login. If already logged in, immediately
 * exchanges for a code and redirects on to the downstream app.
 */
export default function OAuthAuthorize() {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientId = params.get('client_id')
    const redirectUri = params.get('redirect_uri')
    const scope = params.get('scope')
    const state = params.get('state')

    if (!clientId || !redirectUri) {
      setError('This sign-in link is missing required information. Please go back and try again.')
      return
    }

    if (!getCurrentOrgUserClaims()) {
      sessionStorage.setItem(
        'events360_pending_oauth',
        JSON.stringify({ clientId, redirectUri, scope, state })
      )
      navigate('/org/login')
      return
    }

    orgApi
      .oauthAuthorize(clientId, redirectUri, scope, state)
      .then(({ code, state: returnedState }) => {
        const url = new URL(redirectUri)
        url.searchParams.set('code', code)
        if (returnedState) url.searchParams.set('state', returnedState)
        window.location.href = url.toString()
      })
      .catch((e) => setError(e.message))
  }, [navigate])

  return (
    <div className="login-screen">
      <div className="login-card">
        {error ? (
          <>
            <p className="login-eyebrow">Sign-in error</p>
            <div className="error-banner">{error}</div>
          </>
        ) : (
          <>
            <p className="login-eyebrow">Events360</p>
            <h1 className="login-title" style={{ fontSize: 18 }}>
              Signing you in…
            </h1>
          </>
        )}
      </div>
    </div>
  )
}
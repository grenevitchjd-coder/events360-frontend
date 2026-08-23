import { useEffect, useState } from 'react'
import { orgApi } from '../../api'

export default function OrgAppsTab({ onToast }) {
  const [entitlements, setEntitlements] = useState(null)

  useEffect(() => {
    orgApi
      .listEntitlements()
      .then(setEntitlements)
      .catch((e) => onToast(e.message, true))
  }, [])

  if (entitlements === null) return null

  return (
    <>
      <div className="page-title">Apps</div>
      <p className="page-subtitle">
        Everything your organization has access to. You're already signed in — clicking Launch won't ask
        you to log in again.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {entitlements.map((ent) => (
          <div key={ent.product_key} className="panel" style={{ width: 220, marginBottom: 0 }}>
            <div className="panel-title">{ent.name}</div>
            {ent.enabled ? (
              ent.launch_url ? (
                <a className="btn btn-secondary" href={ent.launch_url}>
                  Launch
                </a>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Not yet configured to launch directly.
                </p>
              )
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Not currently included in your plan.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
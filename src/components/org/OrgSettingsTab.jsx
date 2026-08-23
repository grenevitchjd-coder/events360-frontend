import { useNavigate } from 'react-router-dom'
import { orgApi, clearUserToken, getCurrentOrgUserClaims } from '../../api'

export default function OrgSettingsTab({ onToast }) {
  const orgId = getCurrentOrgUserClaims()?.org_id
  const isOwner = getCurrentOrgUserClaims()?.role === 'org_owner'
  const navigate = useNavigate()

  const handleDeleteOrg = async () => {
    const sure = window.confirm(
      'Delete this organization and ALL of its data — events, staff, roles, everything? This cannot be undone.'
    )
    if (!sure) return
    const reallySure = window.confirm('Really sure? Type nothing needed, just confirm one more time.')
    if (!reallySure) return

    try {
      await orgApi.deleteOrg(orgId)
      clearUserToken()
      onToast('Organization deleted')
      navigate('/org/login')
    } catch (e) {
      onToast(e.message, true)
    }
  }

  return (
    <>
      <div className="page-title">Settings</div>
      <p className="page-subtitle">Organization-level settings.</p>

      {isOwner ? (
        <div className="panel" style={{ borderColor: 'var(--danger)' }}>
          <div className="panel-title" style={{ color: 'var(--danger)' }}>
            Danger zone
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 0 }}>
            Deleting your organization removes every event, staff account, and role permanently.
            This can't be undone.
          </p>
          <button className="btn btn-danger" onClick={handleDeleteOrg}>
            Delete organization
          </button>
        </div>
      ) : (
        <p className="page-subtitle">Only the organization owner can access these settings.</p>
      )}
    </>
  )
}
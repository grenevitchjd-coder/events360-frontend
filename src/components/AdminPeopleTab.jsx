// events360-frontend/src/components/AdminPeopleTab.jsx
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import StatusPill from './StatusPill'

export default function AdminPeopleTab({ onToast }) {
  const [people, setPeople] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')

  const load = () => {
    api
      .listOrgAdmins()
      .then(setPeople)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [])

  const sendReset = async (person) => {
    setBusyId(person.id)
    try {
      const res = await api.sendOrgUserReset(person.organization_id, person.id)
      onToast(res.detail)
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!people) return null
    const q = search.trim().toLowerCase()
    if (!q) return people
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.organization_name.toLowerCase().includes(q)
    )
  }, [people, search])

  if (people === null) return null

  // Group by organization, preserving the server's ordering
  const groups = []
  for (const person of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.orgId === person.organization_id) last.people.push(person)
    else groups.push({ orgId: person.organization_id, orgName: person.organization_name, people: [person] })
  }

  return (
    <>
      <div className="section-header">
        <div>
          <div className="page-title">People</div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Org owners and admins, grouped by organization. Staff lockouts are handled by
            their own org's admins — resets here go only to the people who run orgs.
          </p>
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, email, or organization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">
            {people.length === 0 ? 'No org admins yet.' : 'No people match your search.'}
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.orgId} style={{ marginBottom: 28 }}>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              {group.orgName}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.people.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td className="mono">{person.email}</td>
                    <td className="mono">{person.role}</td>
                    <td>
                      <StatusPill status={person.status} />
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === person.id}
                        onClick={() => sendReset(person)}
                      >
                        Send reset link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  )
}
// events360-frontend/src/components/AdminEventsTab.jsx
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import StatusPill from './StatusPill'

function formatDates(event) {
  if (!event.start_date) return '-'
  const start = new Date(event.start_date).toLocaleDateString()
  if (event.end_date && event.end_date !== event.start_date) {
    return `${start} - ${new Date(event.end_date).toLocaleDateString()}`
  }
  return start
}

export default function AdminEventsTab({ onToast }) {
  const [events, setEvents] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')

  const load = () => {
    api
      .listAllEvents()
      .then(setEvents)
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [])

  const run = async (event, action, label) => {
    setBusyId(event.id)
    try {
      await action()
      onToast(`${event.name} ${label}`)
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = (event) => {
    if (!window.confirm(`Delete event "${event.name}"? This can't be undone.`)) return
    run(event, () => api.deleteEvent(event.organization_id, event.id), 'deleted')
  }

  const filtered = useMemo(() => {
    if (!events) return null
    const q = search.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) => e.name.toLowerCase().includes(q) || e.organization_name.toLowerCase().includes(q)
    )
  }, [events, search])

  if (events === null) return null

  // Group by organization, preserving the server's org-then-date ordering
  const groups = []
  for (const event of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.orgId === event.organization_id) last.events.push(event)
    else groups.push({ orgId: event.organization_id, orgName: event.organization_name, events: [event] })
  }

  return (
    <>
      <div className="section-header">
        <div>
          <div className="page-title">Events</div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Every event on the platform, grouped by organization.
          </p>
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Search by event or organization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">
            {events.length === 0 ? 'No events on the platform yet.' : 'No events match your search.'}
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
                  <th>Event</th>
                  <th>Date/s</th>
                  <th>Retention</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.name}</td>
                    <td className="mono">{formatDates(event)}</td>
                    <td className="mono">{event.retention_days}d</td>
                    <td>
                      <StatusPill status={event.status} />
                    </td>
                    <td className="actions-cell">
                      {event.status === 'active' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={busyId === event.id}
                          onClick={() => run(event, () => api.lockEvent(event.organization_id, event.id), 'locked')}
                        >
                          Lock
                        </button>
                      )}
                      {event.status === 'locked' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={busyId === event.id}
                          onClick={() => run(event, () => api.unlockEvent(event.organization_id, event.id), 'unlocked')}
                        >
                          Unlock
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={busyId === event.id}
                        onClick={() => handleDelete(event)}
                      >
                        Delete
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
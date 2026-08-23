import { useEffect, useState } from 'react'
import { orgApi, getCurrentOrgUserClaims } from '../../api'
import StatusPill from '../StatusPill'

export default function OrgEventsTab({ onToast }) {
  const orgId = getCurrentOrgUserClaims()?.org_id
  const [events, setEvents] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [retentionDrafts, setRetentionDrafts] = useState({})
  const [form, setForm] = useState({ name: '', event_date: '' })
  const [creating, setCreating] = useState(false)

  const load = () => {
    orgApi
      .listEvents(orgId)
      .then((data) => {
        setEvents(data)
        setRetentionDrafts(Object.fromEntries(data.map((e) => [e.id, e.retention_days])))
      })
      .catch((e) => onToast(e.message, true))
  }

  useEffect(load, [orgId])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await orgApi.createEvent(orgId, {
        name: form.name,
        event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      })
      onToast(`${form.name} created`)
      setForm({ name: '', event_date: '' })
      load()
    } catch (err) {
      onToast(err.message, true)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (event) => {
    if (!window.confirm(`Delete event "${event.name}"? This can't be undone.`)) return
    setBusyId(event.id)
    orgApi
      .deleteEvent(orgId, event.id)
      .then(() => {
        onToast(`${event.name} deleted`)
        load()
      })
      .catch((e) => onToast(e.message, true))
      .finally(() => setBusyId(null))
  }

  const handleSaveRetention = async (event) => {
    const value = Number(retentionDrafts[event.id])
    if (!value || value < 1 || value > 90) {
      onToast('Retention must be between 1 and 90 days.', true)
      return
    }
    setBusyId(event.id)
    try {
      await orgApi.updateEventRetention(orgId, event.id, value)
      onToast(`Retention for ${event.name} updated to ${value} days`)
      load()
    } catch (e) {
      onToast(e.message, true)
    } finally {
      setBusyId(null)
    }
  }

  if (events === null) return null

  return (
    <>
      <div className="page-title">Events</div>
      <p className="page-subtitle">Create and manage your organization's events.</p>

      <div className="panel">
        <div className="panel-title">Create an event</div>
        <form className="inline-form" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="ev-name">Name</label>
            <input
              id="ev-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="ev-date">Date (optional)</label>
            <input
              id="ev-date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <button className="btn btn-secondary" type="submit" disabled={creating}>
            Create event
          </button>
        </form>
      </div>

      {events.length === 0 ? (
        <div className="data-table">
          <div className="empty-state">No events yet — create your first one above.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Status</th>
              <th>Retention (days)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td className="mono">
                  {event.event_date ? new Date(event.event_date).toLocaleDateString() : '—'}
                </td>
                <td>
                  <StatusPill status={event.status} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={retentionDrafts[event.id] ?? event.retention_days}
                      onChange={(e) =>
                        setRetentionDrafts({ ...retentionDrafts, [event.id]: e.target.value })
                      }
                      style={{
                        width: 64,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        color: 'var(--text)',
                        fontSize: '13px',
                      }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === event.id}
                      onClick={() => handleSaveRetention(event)}
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="actions-cell">
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
      )}
    </>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import NotificationBell from '../components/NotificationBell.jsx'
import { useToast } from '../toast/useToast.js'
import PageSkeleton from '../components/PageSkeleton.jsx'

const TRANSITIONS = {
  reported: ['verified', 'rejected'],
  verified: ['in_progress', 'rejected'],
  in_progress: ['fixed', 'rejected'],
  fixed: [],
  rejected: [],
}

const STATUS_LABELS = {
  reported: 'Reported',
  verified: 'Verified',
  in_progress: 'In progress',
  fixed: 'Fixed',
  rejected: 'Rejected',
}

export default function AuthorityDashboard() {
  const { token, user } = useAuth()
  const showToast = useToast()
  const [reports, setReports] = useState([])
  const [statusFilter, setStatusFilter] = useState('open')
  const [severityFilter, setSeverityFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [queueRevision, setQueueRevision] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [nextStatus, setNextStatus] = useState('')
  const [note, setNote] = useState('')
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchReports() {
      try {
        const params = new URLSearchParams({ sort: 'priority', limit: '200' })
        if (severityFilter) params.set('severity', severityFilter)
        if (areaFilter.trim()) params.set('area', areaFilter.trim())
        const firstResponse = await fetch(`/api/potholes?${params}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        })
        const firstPage = await firstResponse.json()
        if (!firstResponse.ok) throw new Error(firstPage.message || 'Could not load the authority queue.')

        const allReports = [...firstPage.reports]
        for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
          const pageParams = new URLSearchParams(params)
          pageParams.set('page', String(page))
          const response = await fetch(`/api/potholes?${pageParams}`, {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.message || 'Could not load the authority queue.')
          allReports.push(...result.reports)
        }
        if (!controller.signal.aborted) {
          setReports(allReports)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') {
          setErrorMessage(error.message)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchReports()
    return () => controller.abort()
  }, [areaFilter, queueRevision, severityFilter, token])

  const visibleReports = useMemo(() => reports.filter((report) => {
    if (statusFilter === 'open') return ['reported', 'verified', 'in_progress'].includes(report.status)
    if (statusFilter && report.status !== statusFilter) return false
    return true
  }), [reports, statusFilter])

  function openStatusModal(report) {
    setSelectedReport(report)
    setNextStatus(TRANSITIONS[report.status]?.[0] || '')
    setNote('')
    setAfterPhotoUrl('')
    setErrorMessage('')
  }

  async function saveStatus(event) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      const response = await fetch(`/api/potholes/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          note,
          ...(afterPhotoUrl.trim() ? { afterPhotoUrl: afterPhotoUrl.trim() } : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not update the report status.')
      setSelectedReport(null)
      setLoading(true)
      setQueueRevision((revision) => revision + 1)
      showToast('Report status updated.')
    } catch (error) {
      setErrorMessage(error.message)
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const needsNote = ['fixed', 'rejected'].includes(nextStatus)
  const allowedTransitions = selectedReport ? TRANSITIONS[selectedReport.status] || [] : []

  return (
    <main className="authority-page">
      <header className="map-navbar">
        <Link className="map-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <nav className="map-nav-links" aria-label="Main navigation">
          <Link to="/home">Home</Link>
          <Link to="/map">Map</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <span className="authority-user">{user?.name} · {user?.role}</span>
        </nav>
        <NotificationBell />
      </header>

      <section className="authority-content">
        <div className="authority-heading">
          <div>
            <p className="detail-eyebrow">ROAD RESPONSE TEAM</p>
            <h1 className="font-baloo">Authority dashboard</h1>
            <p>Review reports by urgency and keep their status up to date.</p>
          </div>
          <strong className="authority-queue-count">{visibleReports.length} in queue</strong>
        </div>

        <div className="authority-filters">
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => {
              setLoading(true)
              setStatusFilter(event.target.value)
            }}>
              <option value="open">All open statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="">All statuses</option>
            </select>
          </label>
          <label>
            <span>Minimum severity</span>
            <select value={severityFilter} onChange={(event) => {
              setLoading(true)
              setSeverityFilter(event.target.value)
            }}>
              <option value="">Any severity</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}+</option>)}
            </select>
          </label>
          <label className="authority-area-filter">
            <span>Area</span>
            <input
              value={areaFilter}
              onChange={(event) => {
                setLoading(true)
                setAreaFilter(event.target.value)
              }}
              placeholder="Search address or area"
              maxLength={100}
            />
          </label>
        </div>

        {errorMessage && !selectedReport && <p className="authority-error" role="alert">{errorMessage}</p>}
        {loading && <PageSkeleton cards={4} />}
        {!loading && !errorMessage && visibleReports.length === 0 && (
          <p className="authority-message">No reports match these filters.</p>
        )}

        <ul className="authority-queue">
          {visibleReports.map((report) => (
            <li className="authority-report" key={report.id}>
              <Link to={`/potholes/${report.id}`} className="authority-report-photo">
                <img src={report.photoUrl} alt={report.description || 'Pothole report'} />
              </Link>
              <div className="authority-report-main">
                <div className="authority-report-topline">
                  <strong>{report.address || report.description || 'Road hazard report'}</strong>
                  <span className={`authority-status authority-status-${report.status}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                </div>
                <p>
                  Severity {report.ai?.checked ? report.ai.severity : '—'}/5
                  <span> · </span>
                  {report.daysOpen === null ? 'Closed' : `${report.daysOpen} days open`}
                  <span> · </span>
                  {report.upvoteCount} upvotes
                </p>
                <div className="authority-report-meta">
                  <span className={`sla-badge${report.slaBreached ? ' is-overdue' : ''}`}>
                    {report.slaBreached ? 'SLA overdue' : `SLA: ${report.slaDays} days`}
                  </span>
                  <span>Priority {Number(report.priorityScore).toFixed(1)}</span>
                </div>
              </div>
              <button
                type="button"
                className="authority-change-button"
                onClick={() => openStatusModal(report)}
                disabled={!TRANSITIONS[report.status]?.length}
              >
                Change status
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selectedReport && (
        <div className="status-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setSelectedReport(null)
        }}>
          <section className="status-modal" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
            <button type="button" className="status-modal-close" aria-label="Close dialog" onClick={() => setSelectedReport(null)}>×</button>
            <p className="detail-eyebrow">UPDATE ROAD REPORT</p>
            <h2 id="status-modal-title" className="font-baloo">Change status</h2>
            <p>{selectedReport.address || selectedReport.description || 'Pothole report'}</p>
            <form onSubmit={saveStatus}>
              <label>
                <span>New status</span>
                <select required value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                  {allowedTransitions.map((status) => (
                    <option value={status} key={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Update note {needsNote ? '(required)' : '(optional)'}</span>
                <textarea
                  required={needsNote}
                  maxLength={500}
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Explain what happened or what work was done"
                />
              </label>
              {nextStatus === 'fixed' && (
                <label>
                  <span>After photo URL (optional)</span>
                  <input
                    type="text"
                    value={afterPhotoUrl}
                    onChange={(event) => setAfterPhotoUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </label>
              )}
              {errorMessage && <p className="authority-error" role="alert">{errorMessage}</p>}
              <div className="status-modal-actions">
                <button type="button" className="report-another" onClick={() => setSelectedReport(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="auth-submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save update'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

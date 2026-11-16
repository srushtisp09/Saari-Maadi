import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { apiFetch } from '../auth/api.js'
import HotspotMap from '../components/HotspotMap.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'
import { useToast } from '../toast/useToast.js'

const STATUS_LABELS = {
  reported: 'Reported',
  verified: 'Verified',
  in_progress: 'In progress',
  fixed: 'Fixed',
  rejected: 'Rejected',
}

function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

function makeLastThirtyDays(series) {
  const values = new Map(series.map((point) => [point.date, point.count]))
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today.getTime() - (29 - index) * 24 * 60 * 60 * 1000)
    const key = date.toISOString().slice(0, 10)
    return { date: key, count: values.get(key) || 0 }
  })
}

export default function AnalyticsDashboard() {
  const { token } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const [reportPage, setReportPage] = useState(1)
  const showToast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    async function loadAnalytics() {
      try {
        const params = new URLSearchParams({ page: String(reportPage), limit: '50' })
        const response = await apiFetch(`/api/analytics?${params}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load analytics.')
        if (!controller.signal.aborted) {
          setAnalytics(data)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error.message)
      }
    }

    void loadAnalytics()
    return () => controller.abort()
  }, [reportPage, requestVersion, token])

  const lastThirtyDays = useMemo(
    () => makeLastThirtyDays(analytics?.reportsOverTime || []),
    [analytics?.reportsOverTime],
  )
  const trendMax = Math.max(1, ...lastThirtyDays.map((point) => point.count))
  const trendPoints = lastThirtyDays.map((point, index) => (
    `${(index / 29) * 720},${100 - (point.count / trendMax) * 86}`
  )).join(' ')
  const statusMax = Math.max(1, ...(analytics?.reportsByStatus || []).map((item) => item.count))
  const severityMax = Math.max(
    1,
    ...(analytics?.averageDaysToFixBySeverity || []).map((item) => item.averageDays),
  )

  function exportCsv() {
    if (!analytics?.reports.length) {
      showToast('There are no reports to export.', 'info')
      return
    }

    const columns = ['Report ID', 'Description', 'Area', 'Status', 'Severity', 'Upvotes', 'Reporter', 'Reported at', 'Photo URL']
    const rows = analytics.reports.map((report) => [
      report.id,
      report.description,
      report.address,
      report.status,
      report.severity,
      report.upvoteCount,
      report.reportedBy,
      report.createdAt,
      report.photoUrl,
    ])
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'sari-maadi-reports.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    showToast(`Exported ${rows.length} reports as CSV.`)
  }

  return (
    <main className="insights-page">
      <header className="map-navbar">
        <Link className="map-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <nav className="map-nav-links" aria-label="Main navigation">
          <Link to="/home">Home</Link>
          <Link to="/authority">Authority queue</Link>
          <Link to="/city-report">City report card</Link>
        </nav>
        <NotificationBell />
      </header>

      <section className="insights-content">
        <header className="insights-heading analytics-heading">
          <div>
            <p className="detail-eyebrow">STAFF INSIGHTS</p>
            <h1 className="font-baloo">Road analytics</h1>
            <p>Trends and hotspots from real community reports. Seeded demo reports are excluded.</p>
          </div>
          {analytics && (
            <button type="button" className="insight-primary-button" onClick={exportCsv}>
              Export current reports CSV ({analytics.reports.length})
            </button>
          )}
        </header>

        {errorMessage && (
          <div className="insights-error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Try again</button>
          </div>
        )}
        {!analytics && !errorMessage && <PageSkeleton cards={4} />}
        {analytics && (
          <>
            <div className="analytics-chart-grid">
              <section className="insights-panel chart-panel">
                <h2 className="font-baloo">Reports by status</h2>
                {analytics.reportsByStatus.length === 0 ? (
                  <p className="insights-empty">No reports to chart yet.</p>
                ) : (
                  <div className="horizontal-bars" role="img" aria-label="Report totals by status">
                    {analytics.reportsByStatus.map((item) => (
                      <div className="horizontal-bar-row" key={item._id}>
                        <span>{STATUS_LABELS[item._id] || item._id}</span>
                        <span className="horizontal-bar-track">
                          <span style={{ width: `${(item.count / statusMax) * 100}%` }} />
                        </span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="insights-panel chart-panel">
                <h2 className="font-baloo">Reports over the last 30 days</h2>
                {analytics.reportsOverTime.length === 0 ? (
                  <p className="insights-empty">No recent reports to chart.</p>
                ) : (
                  <>
                    <svg className="trend-chart" viewBox="0 0 720 110" role="img" aria-label="Daily reports over the last 30 days">
                      <polyline points={trendPoints} fill="none" stroke="#c1272d" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                    <div className="trend-chart-labels">
                      <span>{lastThirtyDays[0].date}</span>
                      <span>{lastThirtyDays[14].date}</span>
                      <span>{lastThirtyDays[29].date}</span>
                    </div>
                  </>
                )}
              </section>

              <section className="insights-panel chart-panel">
                <h2 className="font-baloo">Average days to fix by severity</h2>
                {analytics.averageDaysToFixBySeverity.length === 0 ? (
                  <p className="insights-empty">No fixed reports with an AI severity score yet.</p>
                ) : (
                  <div className="horizontal-bars" role="img" aria-label="Average days to fix by severity">
                    {analytics.averageDaysToFixBySeverity.map((item) => (
                      <div className="horizontal-bar-row" key={item.severity ?? 'unknown'}>
                        <span>{item.severity ? `Severity ${item.severity}` : 'Not assessed'}</span>
                        <span className="horizontal-bar-track is-turmeric">
                          <span style={{ width: `${(item.averageDays / severityMax) * 100}%` }} />
                        </span>
                        <strong>{item.averageDays}d</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="insights-panel chart-panel sla-chart-card">
                <h2 className="font-baloo">SLA compliance</h2>
                <strong className="sla-percent">{analytics.sla.compliancePercent}%</strong>
                <div
                  className="sla-progress"
                  role="progressbar"
                  aria-label="SLA compliance"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={analytics.sla.compliancePercent}
                >
                  <span style={{ width: `${analytics.sla.compliancePercent}%` }} />
                </div>
                <p>{analytics.sla.openReports - analytics.sla.breachedReports} of {analytics.sla.openReports} open reports are within SLA.</p>
              </section>
            </div>

            <div className="analytics-lower-grid">
              <section className="insights-panel">
                <h2 className="font-baloo">Report density hotspots</h2>
                <HotspotMap hotspots={analytics.hotspots} />
              </section>
              <section className="insights-panel">
                <h2 className="font-baloo">Hotspot areas</h2>
                {analytics.hotspotAreas.length === 0 ? (
                  <p className="insights-empty">No unfixed reports are grouped by area.</p>
                ) : (
                  <ol className="ranked-area-list">
                    {analytics.hotspotAreas.map((area) => (
                      <li key={area.area}>
                        <span>{area.area}</span>
                        <strong>{area.openReports} open</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section className="insights-panel analytics-report-list">
              <div className="insights-section-heading">
                <div>
                  <h2 className="font-baloo">Current report list</h2>
                  <p>
                    Showing reports {((analytics.reportPagination.page - 1) * analytics.reportPagination.limit) + 1}
                    –{Math.min(
                      analytics.reportPagination.page * analytics.reportPagination.limit,
                      analytics.reportPagination.total,
                    )} of {analytics.reportPagination.total}; this page is exported above.
                  </p>
                </div>
                <button type="button" className="insight-secondary-button" onClick={exportCsv}>Export CSV</button>
              </div>
              {analytics.reports.length === 0 ? (
                <p className="insights-empty">No real reports have been submitted yet.</p>
              ) : (
                <ul>
                  {analytics.reports.slice(0, 12).map((report) => (
                    <li key={report.id}>
                      <Link to={`/potholes/${report.id}`}>{report.address || report.description || report.id}</Link>
                      <span>{STATUS_LABELS[report.status] || report.status}</span>
                      <span>{report.severity ? `Severity ${report.severity}` : 'Not assessed'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {analytics.reportPagination.pages > 1 && (
                <nav className="report-pagination" aria-label="Analytics report pages">
                  <button
                    type="button"
                    disabled={reportPage <= 1}
                    onClick={() => setReportPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <span aria-live="polite">
                    Page {reportPage} of {analytics.reportPagination.pages}
                  </span>
                  <button
                    type="button"
                    disabled={reportPage >= analytics.reportPagination.pages}
                    onClick={() => setReportPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}

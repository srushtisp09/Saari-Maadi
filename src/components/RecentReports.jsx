import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import UpvoteButton from './UpvoteButton.jsx'
import PageSkeleton from './PageSkeleton.jsx'

function formatReportTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function RecentReports() {
  const [reports, setReports] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const { token } = useAuth()

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: '100' })
    if (sort === 'priority') params.set('sort', 'priority')
    async function loadReports() {
      try {
        const response = await fetch(`/api/potholes?${params}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load reports.')
        if (!controller.signal.aborted) {
          setReports(data.reports)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadReports()
    return () => controller.abort()
  }, [sort, token])

  const upvoteLabels = {
    upvote: 'Upvote',
    loginToUpvote: 'Log in to support this report.',
    login: 'Log in',
    upvoteError: 'Could not update your upvote.',
    openFor: 'Open for',
    day: 'day',
    days: 'days',
  }

  return (
    <section className="recent-reports mx-auto mt-16 w-full max-w-5xl text-left">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[#c1272d]">
            BENGALURU, LET&apos;S RIDE BETTER
          </p>
          <h2 className="font-baloo text-3xl font-extrabold text-[#1b5e3a]">
            Recent reports
          </h2>
        </div>
        <label className="recent-sort-label">
          <span>Sort reports</span>
          <select value={sort} onChange={(event) => {
            setLoading(true)
            setSort(event.target.value)
          }}>
            <option value="newest">Newest</option>
            <option value="priority">Most urgent</option>
          </select>
        </label>
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-white/80 p-4 text-sm text-[#a51f25]" role="alert">
          {errorMessage}
        </p>
      )}
      {loading && <PageSkeleton cards={3} />}
      {!loading && !errorMessage && reports.length === 0 && (
        <p className="rounded-2xl border border-[#1b5e3a]/10 bg-white/70 p-5 text-[#625d4f]">
          No reports yet. Be the first to help fix a Bengaluru road.
        </p>
      )}
      {!loading && reports.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.slice(0, 6).map((report) => (
            <li className="recent-report-card" key={report.id}>
              <Link to={`/potholes/${report.id}`} className="recent-report-image-link">
                <img
                  src={report.photoUrl}
                  alt={report.description || 'Reported pothole'}
                  loading="lazy"
                />
              </Link>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {report.ai?.checked && (
                    <span className="result-chip">
                      Severity {report.ai.severity}/5
                    </span>
                  )}
                  <span className="result-chip result-chip-status">
                    {{
                      reported: 'Reported',
                      verified: 'Verified',
                      in_progress: 'In progress',
                      fixed: 'Fixed',
                      rejected: 'Rejected',
                    }[report.status] || report.status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-[#494638]">
                  {report.description || report.ai?.reason || 'Road hazard reported.'}
                </p>
                <time
                  className="mt-2 block text-xs text-[#777161]"
                  dateTime={report.createdAt}
                >
                  {formatReportTime(report.createdAt)}
                </time>
                <UpvoteButton report={report} labels={upvoteLabels} />
                <Link className="recent-detail-link" to={`/potholes/${report.id}`}>
                  View details →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'

function formatReportTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function RecentReports() {
  const [reports, setReports] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/potholes', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load reports.')
        return data.reports
      })
      .then(setReports)
      .catch((error) => {
        if (error.name !== 'AbortError') setErrorMessage(error.message)
      })

    return () => controller.abort()
  }, [])

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
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-white/80 p-4 text-sm text-[#a51f25]" role="alert">
          {errorMessage}
        </p>
      )}
      {!errorMessage && reports.length === 0 && (
        <p className="rounded-2xl border border-[#1b5e3a]/10 bg-white/70 p-5 text-[#625d4f]">
          No reports yet. Be the first to help fix a Bengaluru road.
        </p>
      )}
      {reports.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.slice(0, 6).map((report) => (
            <li className="recent-report-card" key={report.id}>
              <img
                src={report.photoUrl}
                alt={report.description || 'Reported pothole'}
                loading="lazy"
              />
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {report.ai?.checked && (
                    <span className="result-chip">
                      Severity {report.ai.severity}/5
                    </span>
                  )}
                  <span className="result-chip result-chip-status">
                    {report.status === 'fixed' ? 'Fixed' : 'Reported'}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

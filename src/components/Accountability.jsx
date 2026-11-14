import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Accountability() {
  const [stats, setStats] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/stats', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load accountability stats.')
        setStats(data)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setErrorMessage(error.message)
      })
    return () => controller.abort()
  }, [])

  if (errorMessage) {
    return <p className="accountability-error" role="alert">{errorMessage}</p>
  }
  if (!stats) return <p className="accountability-strip" role="status">Loading road accountability…</p>

  const oldest = stats.oldestUnfixed[0]
  return (
    <section className="accountability-strip">
      <div>
        <p className="accountability-eyebrow">ROAD ACCOUNTABILITY</p>
        <strong>
          {stats.percentFixed}% fixed · average {stats.averageDaysToFix} days to fix · {stats.slaBreaches} SLA breaches
        </strong>
      </div>
      {oldest && (
        <Link to={`/potholes/${oldest.id}`} className="accountability-oldest">
          Oldest open: {oldest.daysOpen} days <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  )
}

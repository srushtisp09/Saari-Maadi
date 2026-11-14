import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BadgeList from '../components/BadgeList.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'
import { useToast } from '../toast/useToast.js'

export default function CityReportPage() {
  const [reportCard, setReportCard] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const showToast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    async function loadReportCard() {
      try {
        const response = await fetch('/api/city-report', { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load the city report card.')
        if (!controller.signal.aborted) {
          setReportCard(data)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error.message)
      }
    }

    void loadReportCard()
    return () => controller.abort()
  }, [])

  async function shareReportCard() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Bengaluru road report card',
          text: 'See how Bengaluru roads are doing with Sari Maadi.',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('City report card link copied.')
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Could not share the report card.', 'error')
    }
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
          <Link to="/leaderboard">Leaderboard</Link>
        </nav>
      </header>

      <section className="insights-content">
        {errorMessage && <p className="insights-error" role="alert">{errorMessage}</p>}
        {!reportCard && !errorMessage && <PageSkeleton cards={3} />}
        {reportCard && (
          <>
            <header className="insights-heading city-report-heading">
              <div>
                <p className="detail-eyebrow">BENGALURU · COMMUNITY ROAD HEALTH</p>
                <h1 className="font-baloo">City report card</h1>
                <p>Real reports from the Sari Maadi community, excluding demo data.</p>
              </div>
              <button type="button" className="insight-primary-button" onClick={shareReportCard}>
                Share report card
              </button>
            </header>

            <div className="city-metric-grid">
              <article className="insights-panel city-metric">
                <span>Total reports</span>
                <strong>{reportCard.totalReported}</strong>
              </article>
              <article className="insights-panel city-metric">
                <span>Reports fixed</span>
                <strong>{reportCard.percentFixed}%</strong>
              </article>
              <article className="insights-panel city-metric">
                <span>Average time to fix</span>
                <strong>{reportCard.averageDaysToFix} days</strong>
              </article>
            </div>

            <div className="city-report-grid">
              <section className="insights-panel">
                <h2 className="font-baloo">Areas needing attention</h2>
                {reportCard.worstAreas.length === 0 ? (
                  <p className="insights-empty">No unfixed reports right now.</p>
                ) : (
                  <ol className="ranked-area-list">
                    {reportCard.worstAreas.map((area) => (
                      <li key={area.area}>
                        <span>{area.area}</span>
                        <strong>{area.openReports} open</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section className="insights-panel">
                <h2 className="font-baloo">Top contributors</h2>
                {reportCard.topContributors.length === 0 ? (
                  <p className="insights-empty">Citizen contributions will appear here.</p>
                ) : (
                  <ol className="contributor-list">
                    {reportCard.topContributors.map((person, index) => (
                      <li key={person.id}>
                        <span className="contributor-rank">#{index + 1}</span>
                        <div>
                          <strong>{person.name}</strong>
                          <BadgeList badges={person.badges} compact />
                        </div>
                        <span>{person.reports} reports</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

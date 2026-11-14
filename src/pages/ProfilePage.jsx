import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import BadgeList from '../components/BadgeList.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'

const STATUS_LABELS = {
  reported: 'Reported',
  verified: 'Verified',
  in_progress: 'In progress',
  fixed: 'Fixed',
  rejected: 'Rejected',
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export default function ProfilePage() {
  const { token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      try {
        const response = await fetch('/api/profile', {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load your profile.')
        if (!controller.signal.aborted) {
          setProfile(data)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error.message)
      }
    }

    void loadProfile()
    return () => controller.abort()
  }, [token])

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
        <NotificationBell />
      </header>

      <section className="insights-content">
        {errorMessage && <p className="insights-error" role="alert">{errorMessage}</p>}
        {!profile && !errorMessage && <PageSkeleton cards={2} />}
        {profile && (
          <>
            <header className="profile-summary insights-panel">
              <div>
                <p className="detail-eyebrow">CITIZEN PROFILE</p>
                <h1 className="font-baloo">{profile.user.name}</h1>
                <p>Community points and road reports</p>
                <BadgeList badges={profile.user.badges} />
              </div>
              <div className="profile-stats">
                <strong>{profile.user.points}</strong>
                <span>points</span>
                <strong>#{profile.user.rank ?? '—'}</strong>
                <span>all-time rank</span>
              </div>
            </header>

            <section className="profile-reports">
              <div className="insights-section-heading">
                <h2 className="font-baloo">My reports</h2>
                <Link to="/report">Report a pothole →</Link>
              </div>
              {profile.reports.length === 0 ? (
                <p className="insights-empty">You have not reported a pothole yet.</p>
              ) : (
                <ul className="profile-report-list">
                  {profile.reports.map((report) => (
                    <li className="profile-report-card" key={report.id}>
                      <img src={report.photoUrl} alt={report.description || 'My pothole report'} loading="lazy" />
                      <div>
                        <strong>{report.address || report.description || 'Pothole report'}</strong>
                        <p>
                          <span className={`authority-status authority-status-${report.status}`}>
                            {STATUS_LABELS[report.status]}
                          </span>
                          {report.severity && <span> · Severity {report.severity}/5</span>}
                          <span> · {report.upvoteCount} upvotes</span>
                        </p>
                        <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                      </div>
                      <Link to={`/potholes/${report.id}#timeline`}>View timeline</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}

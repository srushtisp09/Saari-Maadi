import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import BadgeList from '../components/BadgeList.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'

export default function LeaderboardPage() {
  const { token, user } = useAuth()
  const [period, setPeriod] = useState('all-time')
  const [data, setData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadLeaderboard() {
      try {
        const response = await fetch(`/api/leaderboard?period=${period}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load the leaderboard.')
        if (!controller.signal.aborted) {
          setData(result)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error.message)
      }
    }

    void loadLeaderboard()
    return () => controller.abort()
  }, [period, token])

  const leaders = (data?.leaders || []).filter((person) => person.id !== data?.currentUser?.id)

  return (
    <main className="insights-page">
      <header className="map-navbar">
        <Link className="map-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <nav className="map-nav-links" aria-label="Main navigation">
          <Link to="/home">Home</Link>
          <Link to="/city-report">City report card</Link>
          {user && <Link to="/profile">My profile</Link>}
        </nav>
        {user && <NotificationBell />}
      </header>

      <section className="insights-content">
        <header className="insights-heading">
          <p className="detail-eyebrow">BENGALURU COMMUNITY</p>
          <h1 className="font-baloo">Leaderboard</h1>
          <p>Every report and upvote helps make the next ride better.</p>
        </header>

        <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard period">
          <button
            type="button"
            role="tab"
            aria-selected={period === 'weekly'}
            onClick={() => setPeriod('weekly')}
          >
            This week
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'all-time'}
            onClick={() => setPeriod('all-time')}
          >
            All time
          </button>
        </div>

        {errorMessage && <p className="insights-error" role="alert">{errorMessage}</p>}
        {!data && !errorMessage && <PageSkeleton cards={4} />}
        {data && leaders.length === 0 && !data.currentUser && (
          <p className="insights-empty">No citizen points yet. Be the first to report a road hazard.</p>
        )}
        {data && leaders.length > 0 && (
          <ol className="leaderboard-list" aria-label="Top citizens">
            {leaders.map((person) => (
              <li className="leaderboard-card" key={person.id}>
                <span className="leaderboard-rank">#{person.rank}</span>
                <div className="leaderboard-person">
                  <strong>{person.name}</strong>
                  <BadgeList badges={person.badges} compact />
                </div>
                <strong className="leaderboard-points">{person.points} pts</strong>
              </li>
            ))}
          </ol>
        )}
        {data?.currentUser && (
          <aside className="leaderboard-current" aria-label="Your leaderboard position">
            <div>
              <p>Your position</p>
              <strong>#{data.currentUserRank} · {data.currentUser.name}</strong>
              <BadgeList badges={data.currentUser.badges} compact />
            </div>
            <strong>{data.currentUser.points} pts</strong>
          </aside>
        )}
        {!user && (
          <p className="leaderboard-signin">
            <Link to="/login">Log in</Link> to see your personal rank.
          </p>
        )}
      </section>
    </main>
  )
}

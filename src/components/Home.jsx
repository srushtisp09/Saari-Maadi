import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Accountability from './Accountability.jsx'
import RecentReports from './RecentReports.jsx'
import NotificationBell from './NotificationBell.jsx'

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <main className="home-screen relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div aria-hidden="true" className="home-sun" />
      <div aria-hidden="true" className="home-road">
        <span />
        <span />
        <span />
      </div>

      <header className="home-navbar">
        <Link className="home-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/map">Map</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/city-report">City report</Link>
          {user && <Link to="/report">Report a pothole</Link>}
          {user && <Link to="/profile">My profile</Link>}
          {['authority', 'admin'].includes(user?.role) && <Link to="/authority">Authority</Link>}
          {['authority', 'admin'].includes(user?.role) && <Link to="/analytics">Analytics</Link>}
        </nav>
        {user && <NotificationBell />}
      </header>

      <div className="home-content relative z-10 mx-auto w-full max-w-3xl text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1b5e3a]/15 bg-white/70 px-4 py-2 text-sm font-bold tracking-wide text-[#1b5e3a] shadow-sm">
          <span aria-hidden="true" className="brand-dot" />
          BENGALURU, LET&apos;S RIDE BETTER
        </div>
        <p className="mb-3 font-kannada text-xl font-semibold text-[#c1272d] sm:text-2xl">
          ಸರಿ ಮಾಡಿ
        </p>
        <h1 className="font-baloo text-6xl font-extrabold leading-[0.95] tracking-tight text-[#1b5e3a] sm:text-8xl">
          Sari Maadi
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg font-medium leading-relaxed text-[#494638] sm:text-2xl">
          Gundi illa, ride chill. <span className="text-[#c1272d]">Sari Maadi!</span>
        </p>
        {user ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <p className="rounded-full bg-white/80 px-5 py-3 font-semibold text-[#1b5e3a] shadow-sm">
              Namaskara, {user.name}!
            </p>
            <Link className="home-auth-link home-auth-primary" to="/report">
              Report a pothole <span aria-hidden="true">→</span>
            </Link>
            <Link className="home-auth-link" to="/map">
              Map <span aria-hidden="true">⌖</span>
            </Link>
            <button type="button" className="home-auth-link" onClick={logout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link className="home-auth-link home-auth-primary" to="/register">
              Join the ride <span aria-hidden="true">→</span>
            </Link>
            <Link className="home-auth-link" to="/login">
              Log in
            </Link>
            <Link className="home-auth-link" to="/map">
              Map <span aria-hidden="true">⌖</span>
            </Link>
          </div>
        )}
        <div className="mx-auto mt-9 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-1 w-12 rounded-full bg-[#1b5e3a]" />
          <span className="h-1 w-5 rounded-full bg-[#f4b400]" />
          <span className="h-1 w-3 rounded-full bg-[#c1272d]" />
        </div>
      </div>
      <div className="relative z-10 mt-20 w-full px-1">
        <Accountability />
        <RecentReports />
      </div>
      <span className="sr-only">Sari Maadi, the Bengaluru pothole tracker.</span>
    </main>
  )
}

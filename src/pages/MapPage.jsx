import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import PotholeMap from '../components/PotholeMap.jsx'

const BENGALURU = [12.9716, 77.5946]

const labels = {
  en: {
    map: 'Map',
    home: 'Home',
    report: 'Report a pothole',
    title: 'Bengaluru pothole map',
    subtitle: 'Find road hazards reported by the community.',
    status: 'Status',
    all: 'All statuses',
    reported: 'Reported',
    fixed: 'Fixed',
    minSeverity: 'Minimum severity',
    anySeverity: 'Any severity',
    locate: 'Locate me',
    locating: 'Locating…',
    locateDenied: 'Location permission was denied. Allow location access in your browser settings to locate yourself.',
    locateUnavailable: 'Could not get your location. Check your device settings and try again.',
    count: 'potholes shown',
    loading: 'Loading reports…',
    empty: 'No potholes match these filters.',
    loadError: 'Could not load pothole reports. Please try again.',
    viewDetails: 'View details',
    severity: 'Severity',
    noAI: 'AI not checked',
    language: 'en',
  },
  kn: {
    map: 'ನಕ್ಷೆ',
    home: 'ಮುಖಪುಟ',
    report: 'ಗುಂಡಿ ವರದಿ ಮಾಡಿ',
    title: 'ಬೆಂಗಳೂರು ಗುಂಡಿ ನಕ್ಷೆ',
    subtitle: 'ಸಮುದಾಯ ವರದಿ ಮಾಡಿದ ರಸ್ತೆ ಸಮಸ್ಯೆಗಳನ್ನು ನೋಡಿ.',
    status: 'ಸ್ಥಿತಿ',
    all: 'ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು',
    reported: 'ವರದಿಯಾಗಿದೆ',
    fixed: 'ಸರಿಪಡಿಸಲಾಗಿದೆ',
    minSeverity: 'ಕನಿಷ್ಠ ತೀವ್ರತೆ',
    anySeverity: 'ಯಾವುದೇ ತೀವ್ರತೆ',
    locate: 'ನನ್ನ ಸ್ಥಳ',
    locating: 'ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ…',
    locateDenied: 'ಸ್ಥಳ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿಸಿ.',
    locateUnavailable: 'ನಿಮ್ಮ ಸ್ಥಳ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಸಾಧನದ ಸೆಟ್ಟಿಂಗ್ ಪರಿಶೀಲಿಸಿ.',
    count: 'ಗುಂಡಿಗಳು ಕಾಣಿಸುತ್ತಿವೆ',
    loading: 'ವರದಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…',
    empty: 'ಈ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಹೊಂದುವ ಗುಂಡಿಗಳಿಲ್ಲ.',
    loadError: 'ವರದಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    viewDetails: 'ವಿವರ ನೋಡಿ',
    severity: 'ತೀವ್ರತೆ',
    noAI: 'AI ಪರಿಶೀಲನೆ ಆಗಿಲ್ಲ',
    language: 'kn',
  },
}

function isValidCoordinate(value, minimum, maximum) {
  if (typeof value !== 'string' || value.trim() === '') return false
  const coordinate = Number(value)
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
}

export default function MapPage() {
  const [language, setLanguage] = useState('en')
  const [status, setStatus] = useState('')
  const [minimumSeverity, setMinimumSeverity] = useState('')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const [locateMessage, setLocateMessage] = useState('')
  const [myCenter, setMyCenter] = useState(null)
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const text = labels[language]
  const focusLat = searchParams.get('lat')
  const focusLng = searchParams.get('lng')
  const focusId = searchParams.get('id')
  const focusCenter = useMemo(() => (
    isValidCoordinate(focusLat, -90, 90) &&
    isValidCoordinate(focusLng, -180, 180)
      ? [Number(focusLat), Number(focusLng)]
      : null
  ), [focusLat, focusLng])
  const center = myCenter || focusCenter || BENGALURU
  const zoom = myCenter || focusCenter ? 15 : 12

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: '200' })
    if (status) params.set('status', status)
    if (minimumSeverity) params.set('severity', minimumSeverity)

    async function loadReports() {
      try {
        const response = await fetch(`/api/potholes?${params}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || labels.en.loadError)
        const allReports = [...data.reports]
        for (let page = 2; page <= data.pagination.pages; page += 1) {
          const pageParams = new URLSearchParams(params)
          pageParams.set('page', String(page))
          const pageResponse = await fetch(`/api/potholes?${pageParams}`, { signal: controller.signal })
          const pageData = await pageResponse.json()
          if (!pageResponse.ok) throw new Error(pageData.message || labels.en.loadError)
          allReports.push(...pageData.reports)
        }
        if (controller.signal.aborted) return
        setErrorMessage('')
        setReports(allReports)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error.message || labels.en.loadError)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadReports()
    return () => controller.abort()
  }, [minimumSeverity, status])

  function locateMe() {
    setLocateMessage('')
    setLocating(true)
    if (!navigator.geolocation) {
      setLocating(false)
      setLocateMessage(text.locateUnavailable)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMyCenter([coords.latitude, coords.longitude])
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        setLocateMessage(
          error.code === error.PERMISSION_DENIED
            ? text.locateDenied
            : text.locateUnavailable,
        )
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  return (
    <main className="map-page">
      <header className="map-navbar">
        <Link className="map-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <nav className="map-nav-links" aria-label="Main navigation">
          <Link to="/home">{text.home}</Link>
          {user && <Link to="/report">{text.report}</Link>}
        </nav>
        <button
          type="button"
          className="language-button is-selected map-language-toggle"
          onClick={() => setLanguage((current) => current === 'en' ? 'kn' : 'en')}
        >
          {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
        </button>
      </header>

      <section className="map-toolbar">
        <div className="map-title-group">
          <h1 className="font-baloo">{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="map-filters">
          <label>
            <span>{text.status}</span>
            <select
              value={status}
              onChange={(event) => {
                setLoading(true)
                setErrorMessage('')
                setStatus(event.target.value)
              }}
            >
              <option value="">{text.all}</option>
              <option value="reported">{text.reported}</option>
              <option value="fixed">{text.fixed}</option>
            </select>
          </label>
          <label>
            <span>{text.minSeverity}</span>
            <select
              value={minimumSeverity}
              onChange={(event) => {
                setLoading(true)
                setErrorMessage('')
                setMinimumSeverity(event.target.value)
              }}
            >
              <option value="">{text.anySeverity}</option>
              {[1, 2, 3, 4, 5].map((severity) => (
                <option key={severity} value={severity}>{severity}+</option>
              ))}
            </select>
          </label>
          <button type="button" className="map-locate-button" onClick={locateMe} disabled={locating}>
            <span aria-hidden="true">⌖</span> {locating ? text.locating : text.locate}
          </button>
        </div>
        <div className="map-status-row">
          <strong aria-live="polite">
            {loading ? text.loading : `${reports.length} ${text.count}`}
          </strong>
          {locateMessage && <span role="alert">{locateMessage}</span>}
          {errorMessage && <span role="alert">{errorMessage}</span>}
        </div>
      </section>

      <section className="map-canvas-wrap" aria-label={text.map}>
        {!loading && !errorMessage && reports.length === 0 && (
          <div className="map-empty-state">{text.empty}</div>
        )}
        <PotholeMap
          reports={reports}
          center={center}
          zoom={zoom}
          selectedId={focusId}
          labels={text}
        />
      </section>
    </main>
  )
}

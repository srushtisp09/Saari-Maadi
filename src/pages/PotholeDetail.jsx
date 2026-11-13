import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PotholeMap from '../components/PotholeMap.jsx'

const copy = {
  en: {
    back: 'Back to map',
    loading: 'Loading report…',
    error: 'Could not load this pothole report.',
    notFound: 'This pothole report could not be found.',
    title: 'Pothole report',
    reported: 'Reported',
    fixed: 'Fixed',
    severity: 'Severity',
    aiReason: 'AI assessment',
    aiUnavailable: 'AI check unavailable',
    location: 'Location',
    description: 'Description',
    reporter: 'Reported by',
    unknownReporter: 'Community member',
    date: 'Reported on',
    map: 'Map location',
  },
  kn: {
    back: 'ನಕ್ಷೆಗೆ ಹಿಂತಿರುಗಿ',
    loading: 'ವರದಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    error: 'ಈ ಗುಂಡಿ ವರದಿಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ.',
    notFound: 'ಈ ಗುಂಡಿ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ.',
    title: 'ಗುಂಡಿ ವರದಿ',
    reported: 'ವರದಿಯಾಗಿದೆ',
    fixed: 'ಸರಿಪಡಿಸಲಾಗಿದೆ',
    severity: 'ತೀವ್ರತೆ',
    aiReason: 'AI ಮೌಲ್ಯಮಾಪನ',
    aiUnavailable: 'AI ಪರಿಶೀಲನೆ ಲಭ್ಯವಿಲ್ಲ',
    location: 'ಸ್ಥಳ',
    description: 'ವಿವರಣೆ',
    reporter: 'ವರದಿ ಮಾಡಿದವರು',
    unknownReporter: 'ಸಮುದಾಯದ ಸದಸ್ಯರು',
    date: 'ವರದಿ ದಿನಾಂಕ',
    map: 'ನಕ್ಷೆಯಲ್ಲಿನ ಸ್ಥಳ',
  },
}

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language === 'kn' ? 'kn' : undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function PotholeDetail() {
  const { id } = useParams()
  const [language, setLanguage] = useState('en')
  const [report, setReport] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadedId, setLoadedId] = useState(null)
  const text = copy[language]
  const loading = loadedId !== id

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/potholes/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          if (response.status === 404) throw new Error(copy.en.notFound)
          throw new Error(data.message || copy.en.error)
        }
        setReport(data.report)
        setErrorMessage('')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setErrorMessage(error.message || copy.en.error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedId(id)
      })
    return () => controller.abort()
  }, [id])

  return (
    <main className="detail-page">
      <header className="map-navbar">
        <Link className="map-brand" to="/home">
          <span className="brand-mark" aria-hidden="true">ಸ</span>
          <span className="font-baloo">Sari Maadi</span>
        </Link>
        <Link className="detail-back-link" to="/map">← {text.back}</Link>
        <button
          type="button"
          className="language-button is-selected map-language-toggle"
          onClick={() => setLanguage((current) => current === 'en' ? 'kn' : 'en')}
        >
          {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
        </button>
      </header>

      <section className="detail-content">
        {loading && <p className="detail-message" role="status">{text.loading}</p>}
        {!loading && errorMessage && <p className="detail-message detail-error" role="alert">{errorMessage}</p>}
        {!loading && !errorMessage && report && (
          <>
            <div className="detail-heading">
              <p className="detail-eyebrow">BENGALURU, LET&apos;S RIDE BETTER</p>
              <h1 className="font-baloo">{text.title}</h1>
              <span className={`map-status-badge map-status-${report.status}`}>
                {report.status === 'fixed' ? text.fixed : text.reported}
              </span>
            </div>

            <div className="detail-grid">
              <div className="detail-primary">
                <img
                  className="detail-photo"
                  src={report.photoUrl}
                  alt={report.description || 'Reported pothole'}
                />
                <section className="detail-card">
                  <h2 className="font-baloo">{text.map}</h2>
                  <div className="detail-map">
                    <PotholeMap
                      reports={[report]}
                      center={[report.location.coordinates[1], report.location.coordinates[0]]}
                      zoom={15}
                      compact
                      labels={{ reported: text.reported, fixed: text.fixed, severity: text.severity, viewDetails: text.title, noAI: text.aiUnavailable, language }}
                    />
                  </div>
                </section>
              </div>

              <aside className="detail-card detail-facts">
                {report.ai?.checked && (
                  <div className="detail-fact">
                    <span>{text.severity}</span>
                    <strong>{report.ai.severity}/5</strong>
                  </div>
                )}
                <div className="detail-fact">
                  <span>{text.aiReason}</span>
                  <strong>{report.ai?.checked ? report.ai.reason : text.aiUnavailable}</strong>
                </div>
                <div className="detail-fact">
                  <span>{text.location}</span>
                  <strong>{report.address || `${report.location.coordinates[1].toFixed(5)}, ${report.location.coordinates[0].toFixed(5)}`}</strong>
                </div>
                {report.description && (
                  <div className="detail-fact">
                    <span>{text.description}</span>
                    <strong>{report.description}</strong>
                  </div>
                )}
                <div className="detail-fact">
                  <span>{text.reporter}</span>
                  <strong>{report.reportedBy?.name || text.unknownReporter}</strong>
                </div>
                <div className="detail-fact">
                  <span>{text.date}</span>
                  <strong>{formatDate(report.createdAt, language)}</strong>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

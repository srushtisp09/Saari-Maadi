import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { useToast } from '../toast/useToast.js'

const labels = {
  en: {
    eyebrow: 'BENGALURU, LET’S RIDE BETTER',
    title: 'Report a pothole',
    intro: 'A clear photo helps us get this road fixed sooner.',
    photo: 'Pothole photo',
    choosePhoto: 'Choose a photo',
    photoHint: 'JPEG, PNG or WebP · up to 5 MB',
    location: 'Location',
    getLocation: 'Use my current location',
    locating: 'Getting your location…',
    locationReady: 'Location ready',
    locationDenied: 'Location permission was denied. Allow location access in your browser settings, or try again.',
    locationUnavailable: 'Could not get your location. Check your device location settings and try again.',
    description: 'Description (optional)',
    descriptionHint: 'Nearby landmark or anything riders should know',
    submit: 'Check photo & report',
    submitting: 'AI is checking your photo…',
    back: 'Back to home',
    locationRequired: 'Get your current location before submitting.',
    photoRequired: 'Choose a pothole photo before submitting.',
    success: 'Report submitted successfully.',
    savedWithoutAI: 'AI check was skipped; your report was saved and will not be lost.',
    notPothole: 'This photo was not recognized as a pothole. Please retake the photo and try again.',
    severity: 'Severity',
    confidence: 'AI confidence',
    points: 'points earned',
    statusReported: 'Reported',
    viewOnMap: 'View on map',
    successTitle: 'Thanks for helping Bengaluru!',
    aiSkipped: 'Your report is saved. The AI check was unavailable this time.',
    switchLanguage: 'ಕನ್ನಡ',
    duplicateTitle: 'A pothole is already reported nearby',
    duplicateDetails: 'It may be the same road damage. You can support the existing report or submit this as a different pothole.',
    samePothole: 'Same pothole, upvote it',
    differentPothole: 'No, this is a different one',
    upvotedDuplicate: 'Thanks! Your upvote was added.',
    openFor: 'Open for',
    day: 'day',
    days: 'days',
    upvotes: 'upvotes',
  },
  kn: {
    eyebrow: 'ಬೆಂಗಳೂರು ರಸ್ತೆಗಳ ಪ್ರಯಾಣ ಸುಗಮವಾಗಲಿ',
    title: 'ಗುಂಡಿ ವರದಿ ಮಾಡಿ',
    intro: 'ಸ್ಪಷ್ಟವಾದ ಫೋಟೋ ರಸ್ತೆ ಸರಿಪಡಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    photo: 'ಗುಂಡಿಯ ಫೋಟೋ',
    choosePhoto: 'ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ',
    photoHint: 'JPEG, PNG ಅಥವಾ WebP · ಗರಿಷ್ಠ 5 MB',
    location: 'ಸ್ಥಳ',
    getLocation: 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ',
    locating: 'ನಿಮ್ಮ ಸ್ಥಳ ಪಡೆಯಲಾಗುತ್ತಿದೆ…',
    locationReady: 'ಸ್ಥಳ ಸಿದ್ಧವಾಗಿದೆ',
    locationDenied: 'ಸ್ಥಳ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿಸಿ.',
    locationUnavailable: 'ನಿಮ್ಮ ಸ್ಥಳ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಸಾಧನದ ಸ್ಥಳ ಸೆಟ್ಟಿಂಗ್ ಪರಿಶೀಲಿಸಿ.',
    description: 'ವಿವರಣೆ (ಐಚ್ಛಿಕ)',
    descriptionHint: 'ಹತ್ತಿರದ ಗುರುತು ಅಥವಾ ಪ್ರಯಾಣಿಕರಿಗೆ ಉಪಯುಕ್ತ ಮಾಹಿತಿ',
    submit: 'ಫೋಟೋ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವರದಿ ಮಾಡಿ',
    submitting: 'AI ಫೋಟೋ ಪರಿಶೀಲಿಸುತ್ತಿದೆ…',
    back: 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
    locationRequired: 'ವರದಿ ಮಾಡುವ ಮೊದಲು ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಪಡೆಯಿರಿ.',
    photoRequired: 'ವರದಿ ಮಾಡುವ ಮೊದಲು ಗುಂಡಿಯ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ.',
    success: 'ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.',
    savedWithoutAI: 'AI ಪರಿಶೀಲನೆ ಆಗಲಿಲ್ಲ; ನಿಮ್ಮ ವರದಿ ಉಳಿಸಲಾಗಿದೆ.',
    notPothole: 'ಈ ಫೋಟೋದಲ್ಲಿ ರಸ್ತೆ ಗುಂಡಿ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೊಂದು ಫೋಟೋ ತೆಗೆದು ಪ್ರಯತ್ನಿಸಿ.',
    severity: 'ತೀವ್ರತೆ',
    confidence: 'AI ವಿಶ್ವಾಸ',
    points: 'ಅಂಕಗಳು ಗಳಿಸಲಾಗಿದೆ',
    statusReported: 'ವರದಿಯಾಗಿದೆ',
    viewOnMap: 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ',
    successTitle: 'ಬೆಂಗಳೂರಿಗೆ ಸಹಾಯ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು!',
    aiSkipped: 'ವರದಿ ಉಳಿಸಲಾಗಿದೆ. ಈ ಬಾರಿ AI ಪರಿಶೀಲನೆ ಲಭ್ಯವಿರಲಿಲ್ಲ.',
    switchLanguage: 'English',
    duplicateTitle: 'ಹತ್ತಿರದಲ್ಲೇ ಗುಂಡಿ ವರದಿಯಾಗಿದೆ',
    duplicateDetails: 'ಇದು ಅದೇ ರಸ್ತೆ ಹಾನಿಯಾಗಿರಬಹುದು. ಈಗಿರುವ ವರದಿಗೆ ಮತ ನೀಡಿ ಅಥವಾ ಬೇರೆ ಗುಂಡಿಯಾಗಿ ಸಲ್ಲಿಸಿ.',
    samePothole: 'ಅದೇ ಗುಂಡಿ, ಮತ ನೀಡಿ',
    differentPothole: 'ಇಲ್ಲ, ಇದು ಬೇರೆ ಗುಂಡಿ',
    upvotedDuplicate: 'ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಮತ ಸೇರಿಸಲಾಗಿದೆ.',
    openFor: 'ತೆರೆದಿದ್ದು',
    day: 'ದಿನ',
    days: 'ದಿನಗಳು',
    upvotes: 'ಮತಗಳು',
  },
}

function formatCoordinates(location) {
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
}

export default function ReportPothole() {
  const [language, setLanguage] = useState('en')
  const [photo, setPhoto] = useState(null)
  const [location, setLocation] = useState(null)
  const [locationState, setLocationState] = useState('idle')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { token } = useAuth()
  const showToast = useToast()
  const navigate = useNavigate()
  const text = labels[language]
  const previewUrl = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function getCurrentLocation() {
    setLocation(null)
    setLocationState('loading')
    setErrorMessage('')

    if (!navigator.geolocation) {
      setLocationState('error')
      setErrorMessage(text.locationUnavailable)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude })
        setLocationState('ready')
      },
      (error) => {
        setLocationState('error')
        setErrorMessage(
          error.code === error.PERMISSION_DENIED
            ? text.locationDenied
            : text.locationUnavailable,
        )
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }

  async function submitReport(event, forceNew = false) {
    event?.preventDefault()
    setErrorMessage('')
    setMessage('')
    setResult(null)
    setDuplicate(null)
    setDuplicateMessage('')
    if (!photo) {
      setErrorMessage(text.photoRequired)
      return
    }
    if (!location) {
      setErrorMessage(text.locationRequired)
      return
    }

    const formData = new FormData()
    formData.append('photo', photo)
    formData.append('lat', String(location.lat))
    formData.append('lng', String(location.lng))
    formData.append('description', description)
    if (forceNew) formData.append('forceNew', 'true')

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/potholes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 409 && data.existingPothole) {
        setDuplicate(data.existingPothole)
        return
      }
      if (!response.ok) {
        setResult(data.ai ? { rejected: true, ai: data.ai } : null)
        const notPotholeMessage = data.ai?.checked && !data.ai.isPothole
          ? `${text.notPothole} ${data.ai.reason || ''}`.trim()
          : data.message || text.notPothole
        throw new Error(notPotholeMessage)
      }

      setResult(data)
      setMessage(data.message || text.success)
      showToast(data.message || text.success)
      setPhoto(null)
      setDescription('')
    } catch (error) {
      const errorText = error instanceof Error ? error.message : text.notPothole
      setErrorMessage(errorText)
      showToast(errorText, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function upvoteDuplicate() {
    if (!duplicate) return
    setDuplicateBusy(true)
    setErrorMessage('')
    try {
      const response = await fetch(`/api/potholes/${duplicate.id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || text.duplicateDetails)
      setDuplicate((current) => ({
        ...current,
        upvoteCount: data.report.upvoteCount,
        hasUpvoted: true,
      }))
      setDuplicateMessage(text.upvotedDuplicate)
      showToast(text.upvotedDuplicate)
    } catch (error) {
      setErrorMessage(error.message || text.duplicateDetails)
      showToast(error.message || text.duplicateDetails, 'error')
    } finally {
      setDuplicateBusy(false)
    }
  }

  return (
    <main className="auth-screen relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden="true" className="auth-decoration auth-decoration-one" />
      <div aria-hidden="true" className="auth-decoration auth-decoration-two" />
      <section className="auth-card relative z-10 w-full max-w-xl rounded-[2rem] border border-[#1b5e3a]/10 bg-white/90 p-6 shadow-[0_24px_70px_rgba(47,45,33,.12)] backdrop-blur sm:p-9">
        <div className="mb-7 flex items-center justify-between gap-3">
          <Link to="/home" className="font-baloo text-lg font-extrabold text-[#1b5e3a] no-underline">
            ← {text.back}
          </Link>
          <button
            type="button"
            className="language-button is-selected"
            onClick={() => setLanguage((current) => current === 'en' ? 'kn' : 'en')}
          >
            {text.switchLanguage}
          </button>
        </div>

        <p className="mb-2 text-xs font-extrabold tracking-[0.14em] text-[#c1272d]">
          {text.eyebrow}
        </p>
        <h1 className="font-baloo text-4xl font-extrabold leading-tight text-[#1b5e3a]">
          {text.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#625d4f]">{text.intro}</p>

        <form className="mt-7 space-y-5" onSubmit={submitReport}>
          <label className="auth-label">
            <span>{text.photo}</span>
            <input
              className="photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
              onChange={(event) => {
                const nextPhoto = event.target.files?.[0] ?? null
                setErrorMessage('')
                setResult(null)
                if (nextPhoto && nextPhoto.size > 5 * 1024 * 1024) {
                  setPhoto(null)
                  setErrorMessage('Photo must be 5 MB or smaller.')
                  event.target.value = ''
                  return
                }
                setPhoto(nextPhoto)
              }}
            />
            <span className="auth-hint">{text.photoHint}</span>
          </label>

          {previewUrl && (
            <div className="photo-preview-wrap">
              <img src={previewUrl} className="photo-preview" alt="Selected pothole preview" />
              <span className="photo-preview-badge">{photo.name}</span>
            </div>
          )}

          <div className="auth-label">
            <span>{text.location}</span>
            <button
              className="location-button"
              type="button"
              disabled={locationState === 'loading'}
              onClick={getCurrentLocation}
            >
              <span aria-hidden="true">{locationState === 'ready' ? '✓' : '⌖'}</span>
              {locationState === 'loading' ? text.locating : text.getLocation}
            </button>
            {location && (
              <span className="location-readout" role="status">
                {text.locationReady}: {formatCoordinates(location)}
              </span>
            )}
          </div>

          <label className="auth-label">
            <span>{text.description}</span>
            <textarea
              className="report-description"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={text.descriptionHint}
            />
          </label>

          {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}

          {duplicate && (
            <section className="duplicate-report-card" aria-live="polite">
              <img src={duplicate.photoUrl} alt={text.duplicateTitle} />
              <div>
                <h2 className="font-baloo">{text.duplicateTitle}</h2>
                <p>{text.duplicateDetails}</p>
                <div className="duplicate-report-facts">
                  {duplicate.severity && <span>{text.severity}: {duplicate.severity}/5</span>}
                  <span>{duplicate.upvoteCount} {text.upvotes}</span>
                  {duplicate.daysOpen !== null && (
                    <span className={`open-days-badge${duplicate.daysOpen >= 14 ? ' is-overdue' : ''}`}>
                      {text.openFor} {duplicate.daysOpen} {duplicate.daysOpen === 1 ? text.day : text.days}
                    </span>
                  )}
                </div>
                <div className="duplicate-report-actions">
                  <button
                    type="button"
                    className="auth-submit"
                    onClick={upvoteDuplicate}
                    disabled={duplicateBusy || duplicate.hasUpvoted}
                  >
                    {duplicateBusy ? text.submitting : duplicate.hasUpvoted ? text.upvotedDuplicate : text.samePothole}
                  </button>
                  <button
                    type="button"
                    className="report-another"
                    onClick={() => submitReport(null, true)}
                    disabled={isSubmitting}
                  >
                    {text.differentPothole}
                  </button>
                </div>
                {duplicateMessage && <p className="report-notice" role="status">{duplicateMessage}</p>}
              </div>
            </section>
          )}

          {message && result && !result.report?.ai?.checked && (
            <p className="report-notice" role="status">{text.aiSkipped}</p>
          )}

          {result?.report?.ai?.checked && (
            <div className="report-result" role="status">
              <p className="font-baloo text-xl font-extrabold text-[#1b5e3a]">
                {text.successTitle}
              </p>
              <p>{result.report.ai.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="result-chip">{text.severity}: {result.report.ai.severity}/5</span>
                <span className="result-chip">
                  {text.confidence}: {Math.round(result.report.ai.confidence * 100)}%
                </span>
                {result.pointsAwarded > 0 && (
                  <span className="result-chip result-chip-points">
                    +{result.pointsAwarded} {text.points}
                  </span>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? text.submitting : text.submit}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {result?.report && (
          <div className="report-success-actions">
            <button
              className="report-another"
              type="button"
              onClick={() => navigate(
                `/map?lat=${result.report.location.coordinates[1]}&lng=${result.report.location.coordinates[0]}&id=${result.report.id}`,
              )}
            >
              {text.viewOnMap} <span aria-hidden="true">→</span>
            </button>
            <button className="report-another" type="button" onClick={() => navigate('/home')}>
              {text.back}
            </button>
          </div>
        )}
      </section>
      {isSubmitting && (
        <div className="report-loading-overlay" role="status" aria-live="polite">
          <div className="report-loading-card">
            <span className="report-spinner" aria-hidden="true" />
            <strong>{text.submitting}</strong>
          </div>
        </div>
      )}
    </main>
  )
}

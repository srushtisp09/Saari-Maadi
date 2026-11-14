import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { useToast } from '../toast/useToast.js'

export default function UpvoteButton({ report, labels = {}, onUpdated }) {
  const { token } = useAuth()
  const showToast = useToast()
  const [current, setCurrent] = useState(report)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loginPrompt, setLoginPrompt] = useState(false)

  async function toggleUpvote() {
    if (!token) {
      setLoginPrompt(true)
      return
    }

    setBusy(true)
    setErrorMessage('')
    setLoginPrompt(false)
    try {
      const response = await fetch(`/api/potholes/${current.id}/upvote`, {
        method: current.hasUpvoted ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || labels.upvoteError || 'Could not update your upvote.')
      setCurrent(data.report)
      onUpdated?.(data.report)
      showToast(data.message)
    } catch (error) {
      setErrorMessage(error.message || labels.upvoteError)
      showToast(error.message || labels.upvoteError || 'Could not update your upvote.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upvote-control">
      <button
        type="button"
        className={`upvote-button${current.hasUpvoted ? ' is-upvoted' : ''}`}
        aria-pressed={Boolean(current.hasUpvoted)}
        onClick={toggleUpvote}
        disabled={busy || current.status === 'fixed'}
      >
        <span aria-hidden="true">{current.hasUpvoted ? '♥' : '♡'}</span>
        <span>{labels.upvote || 'Upvote'}</span>
        <strong>{current.upvoteCount ?? 0}</strong>
      </button>
      {current.status === 'reported' && current.daysOpen !== null && current.daysOpen !== undefined && (
        <span className={`open-days-badge${current.daysOpen >= 14 ? ' is-overdue' : ''}`}>
          {labels.openFor || 'Open for'} {current.daysOpen} {current.daysOpen === 1 ? labels.day || 'day' : labels.days || 'days'}
        </span>
      )}
      {loginPrompt && (
        <p className="upvote-feedback" role="status">
          {labels.loginToUpvote || 'Log in to upvote this report.'} <Link to="/login">{labels.login || 'Log in'}</Link>
        </p>
      )}
      {errorMessage && <p className="upvote-feedback upvote-error" role="alert">{errorMessage}</p>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function NotificationBell() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications', {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load notifications.')
        if (!controller.signal.aborted) {
          setNotifications(data.notifications)
          setUnreadCount(data.unreadCount)
          setErrorMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') {
          setErrorMessage(error.message)
        }
      }
    }

    void fetchNotifications()
    const intervalId = window.setInterval(() => void fetchNotifications(), 30_000)
    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [token])

  async function markAllRead() {
    setIsMarkingRead(true)
    setErrorMessage('')
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not mark notifications as read.')
      setNotifications((items) => items.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsMarkingRead(false)
    }
  }

  return (
    <div className="notification-control">
      <button
        type="button"
        className="notification-bell"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <section className="notification-menu" aria-label="Notifications">
          <div className="notification-menu-header">
            <strong>Notifications</strong>
            <button type="button" onClick={markAllRead} disabled={!unreadCount || isMarkingRead}>
              {isMarkingRead ? 'Saving…' : 'Mark all as read'}
            </button>
          </div>
          {errorMessage && <p className="notification-error" role="alert">{errorMessage}</p>}
          {!errorMessage && notifications.length === 0 && (
            <p className="notification-empty">You’re all caught up.</p>
          )}
          <ul>
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.read ? '' : 'is-unread'}>
                <Link to={`/potholes/${notification.reportId}`} onClick={() => setIsOpen(false)}>
                  <span>{notification.message}</span>
                  <time dateTime={notification.createdAt}>{formatTime(notification.createdAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

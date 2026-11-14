import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import UpvoteButton from './UpvoteButton.jsx'

const BENGALURU = [12.9716, 77.5946]

function markerIcon(report) {
  const isSevere = report.ai?.checked && report.ai.severity >= 4
  const color = report.status === 'fixed' ? 'fixed' : 'reported'
  const severity = report.ai?.checked ? report.ai.severity : '·'
  return L.divIcon({
    className: 'pothole-marker-container',
    html: `<span class="pothole-marker pothole-marker-${color}${isSevere ? ' pothole-marker-severe' : ''}"><span class="pothole-marker-severity">${severity}</span></span>`,
    iconSize: isSevere ? [40, 48] : [32, 40],
    iconAnchor: isSevere ? [20, 46] : [16, 38],
    popupAnchor: [0, -38],
  })
}

function formatTimeAgo(value, language) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  const formatter = new Intl.RelativeTimeFormat(language === 'kn' ? 'kn' : 'en', { numeric: 'auto' })
  if (seconds < 60) return formatter.format(0, 'second')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return formatter.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return formatter.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 30) return formatter.format(-days, 'day')
  return new Intl.DateTimeFormat(language === 'kn' ? 'kn' : undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function MapController({ center, zoom, selectedId, reports }) {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
  }, [map])

  useEffect(() => {
    map.setView(center, zoom, { animate: false })
  }, [center, map, zoom])

  useEffect(() => {
    if (!selectedId) return
    const report = reports.find((item) => item.id === selectedId)
    if (report) map.flyTo([report.location.coordinates[1], report.location.coordinates[0]], 16, { duration: 0.6 })
  }, [map, reports, selectedId])

  return null
}

export default function PotholeMap({
  reports,
  center = BENGALURU,
  zoom = 12,
  selectedId = null,
  compact = false,
  labels = {},
}) {
  const markerEntries = useMemo(
    () => reports.map((report) => ({
      report,
      icon: markerIcon(report),
      position: [report.location.coordinates[1], report.location.coordinates[0]],
    })),
    [reports],
  )

  return (
    <MapContainer
      className={`pothole-map${compact ? ' pothole-map-compact' : ''}`}
      center={center}
      zoom={zoom}
      scrollWheelZoom={!compact}
      zoomControl={!compact}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} zoom={zoom} selectedId={selectedId} reports={reports} />
      <MarkerClusterGroup
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={55}
      >
        {markerEntries.map(({ report, icon, position }) => (
          <Marker key={report.id} position={position} icon={icon}>
            <Popup>
              <article className="map-popup">
                <img src={report.photoUrl} alt={report.description || 'Pothole report'} />
                <div className="map-popup-content">
                  <div className="map-popup-badges">
                    <span className={`map-status-badge map-status-${report.status}`}>
                      {labels[report.status] || report.status}
                    </span>
                    {report.ai?.checked ? (
                      <span className="map-severity-badge">
                        {labels.severity} {report.ai.severity}/5
                      </span>
                    ) : (
                      <span className="map-severity-badge">{labels.noAI}</span>
                    )}
                  </div>
                  <UpvoteButton
                    key={report.id}
                    report={report}
                    labels={{
                      upvote: labels.upvote,
                      loginToUpvote: labels.loginToUpvote,
                      login: labels.login,
                      upvoteError: labels.upvoteError,
                      openFor: labels.openFor,
                      day: labels.day,
                      days: labels.days,
                    }}
                  />
                  <time>{formatTimeAgo(report.createdAt, labels.language)}</time>
                  <Link to={`/potholes/${report.id}`}>{labels.viewDetails}</Link>
                </div>
              </article>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}

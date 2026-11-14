import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'

const BENGALURU = [12.9716, 77.5946]

export default function HotspotMap({ hotspots }) {
  if (!hotspots.length) {
    return <p className="insights-empty">No location hotspots to display.</p>
  }

  return (
    <MapContainer className="hotspot-map" center={BENGALURU} zoom={11} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotspots.map((spot) => (
        <CircleMarker
          key={`${spot.lat}-${spot.lng}`}
          center={[spot.lat, spot.lng]}
          radius={Math.min(8 + spot.reportCount * 3, 30)}
          pathOptions={{
            color: '#c1272d',
            fillColor: '#f4b400',
            fillOpacity: 0.42,
            weight: 2,
          }}
        >
          <Tooltip>
            {spot.reportCount} reports · {spot.openReports} open
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

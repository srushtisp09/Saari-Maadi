export default function BadgeList({ badges = [], compact = false }) {
  if (!badges.length) return null

  return (
    <ul className={`badge-list${compact ? ' badge-list-compact' : ''}`} aria-label="Earned badges">
      {badges.map((badge) => (
        <li className="badge-chip" key={badge.key} title={badge.description}>
          <span aria-hidden="true">{badge.icon}</span>
          <span>{badge.name}</span>
        </li>
      ))}
    </ul>
  )
}

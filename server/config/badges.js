export const BADGE_RULES = Object.freeze([
  {
    key: 'first-report',
    name: 'First Report',
    description: 'Reported your first pothole.',
    icon: '📍',
    metric: 'reports',
    threshold: 1,
  },
  {
    key: 'good-samaritan',
    name: 'Good Samaritan',
    description: 'Reported 5 potholes.',
    icon: '🤝',
    metric: 'reports',
    threshold: 5,
  },
  {
    key: 'community-voice',
    name: 'Community Voice',
    description: 'Received 50 upvotes across your reports.',
    icon: '📣',
    metric: 'upvotesReceived',
    threshold: 50,
  },
  {
    key: 'problem-solver',
    name: 'Problem Solver',
    description: 'Had 3 pothole reports fixed.',
    icon: '🛠️',
    metric: 'fixedReports',
    threshold: 3,
  },
])

const badgesByKey = new Map(BADGE_RULES.map((badge) => [badge.key, badge]))

export function getBadgeDetails(keys = []) {
  return keys.map((key) => badgesByKey.get(key)).filter(Boolean)
}

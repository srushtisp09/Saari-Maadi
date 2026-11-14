export const SLA_DAYS = Object.freeze({
  high: 3,
  medium: 7,
  low: 14,
})

export function getSlaDays(report) {
  const severity = report.ai?.checked ? report.ai.severity : null
  if (severity >= 4) return SLA_DAYS.high
  if (severity === 3) return SLA_DAYS.medium
  return SLA_DAYS.low
}

export function isOpenStatus(status) {
  return ['reported', 'verified', 'in_progress'].includes(status)
}

export function isSlaBreached(report, now = Date.now()) {
  if (!isOpenStatus(report.status)) return false
  const daysOpen = Math.max(0, (now - new Date(report.createdAt).getTime()) / 86_400_000)
  return daysOpen > getSlaDays(report)
}

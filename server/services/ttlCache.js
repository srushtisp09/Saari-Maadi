export function createTtlCache(ttlMs) {
  let value
  let expiresAt = 0

  return {
    get() {
      if (Date.now() >= expiresAt) return undefined
      return value
    },
    set(nextValue) {
      value = nextValue
      expiresAt = Date.now() + ttlMs
      return value
    },
    clear() {
      value = undefined
      expiresAt = 0
    },
  }
}

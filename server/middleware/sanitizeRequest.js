import xss from 'xss'

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
}

function clean(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => clean(item, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([name]) => !name.startsWith('$') && !name.includes('.'))
        .map(([name, item]) => [name, clean(item, name)]),
    )
  }
  if (typeof value === 'string' && key !== 'password') {
    return xss(value, xssOptions)
  }
  return value
}

export function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body)
  }
  return next()
}

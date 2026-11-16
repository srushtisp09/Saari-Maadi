export function validateRequest(schema, source = 'body') {
  return function requestValidator(req, res, next) {
    const input = req[source] ?? {}
    const result = schema.safeParse(input)
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      const firstDetail = details[0]
      const field = firstDetail?.field || 'Request'
      return res.status(400).json({
        message: firstDetail ? `${field}: ${firstDetail.message}` : 'Request validation failed.',
        details,
      })
    }

    req.validated ??= {}
    req.validated[source] = result.data
    if (source !== 'query') req[source] = result.data
    return next()
  }
}

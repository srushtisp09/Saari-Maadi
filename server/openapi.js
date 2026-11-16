const errorResponse = {
  description: 'The request failed.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        error: {
          code: 'BAD_REQUEST',
          message: 'Request validation failed.',
          details: [{ field: 'email', message: 'Invalid email address.' }],
        },
        message: 'Request validation failed.',
      },
    },
  },
}

const jsonRequest = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` },
      example,
    },
  },
})

const bearer = [{ bearerAuth: [] }]

const document = {
  openapi: '3.0.3',
  info: {
    title: 'Sari Maadi API',
    version: '2.0.0',
    description: 'Bengaluru pothole reporting, community engagement, and authority workflow API.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Potholes' },
    { name: 'Insights' },
    { name: 'Notifications' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database health',
        responses: {
          200: {
            description: 'The database is reachable.',
            content: { 'application/json': { example: { status: 'ok', database: 'connected' } } },
          },
          503: errorResponse,
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a citizen account',
        requestBody: jsonRequest('RegisterRequest', {
          name: 'Asha Rao',
          email: 'asha@example.com',
          password: 'StrongPass123',
        }),
        responses: {
          201: {
            description: 'Account created. A short-lived access token is returned and a refresh token is set in an HttpOnly cookie.',
            content: {
              'application/json': {
                example: {
                  token: 'eyJ...short-lived-access-token',
                  user: { id: '65a000000000000000000001', name: 'Asha Rao', email: 'asha@example.com', role: 'citizen', points: 0, badges: [] },
                },
              },
            },
          },
          400: errorResponse,
          409: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        requestBody: jsonRequest('LoginRequest', { email: 'asha@example.com', password: 'StrongPass123' }),
        responses: {
          200: {
            description: 'Signed in; sets an HttpOnly refresh cookie.',
            content: { 'application/json': { example: { token: 'eyJ...short-lived-access-token', user: { id: '65a000000000000000000001', name: 'Asha Rao', email: 'asha@example.com', role: 'citizen', points: 0, badges: [] } } } },
          },
          400: errorResponse,
          401: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate the refresh cookie and issue a new access token',
        description: 'Requires the HttpOnly refresh cookie set by login or registration.',
        responses: {
          200: { description: 'New access token.', content: { 'application/json': { example: { token: 'eyJ...new-short-lived-access-token' } } } },
          401: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke the current session',
        security: bearer,
        responses: {
          200: { description: 'Signed out.', content: { 'application/json': { example: { message: 'You have been signed out.' } } } },
          401: errorResponse,
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the signed-in user',
        security: bearer,
        responses: {
          200: { description: 'Current user without password credentials.', content: { 'application/json': { example: { user: { id: '65a000000000000000000001', name: 'Asha Rao', email: 'asha@example.com', role: 'citizen', points: 10, badges: [] } } } } },
          401: errorResponse,
        },
      },
    },
    '/api/potholes': {
      get: {
        tags: ['Potholes'],
        summary: 'List potholes',
        description: 'Paginated newest-first list; use sort=priority for urgency ranking. mine=true requires authentication.',
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['reported', 'verified', 'in_progress', 'fixed', 'rejected'] } },
          { in: 'query', name: 'severity', schema: { type: 'integer', minimum: 1, maximum: 5 } },
          { in: 'query', name: 'mine', schema: { type: 'boolean' } },
          { in: 'query', name: 'area', schema: { type: 'string', maxLength: 100 } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['priority'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 200, default: 100 } },
        ],
        security: [{}, ...bearer],
        responses: {
          200: { description: 'Page of reports.', content: { 'application/json': { example: { reports: [{ id: '65a000000000000000000010', photoUrl: 'https://example.test/uploads/pothole.jpg', status: 'reported', ai: { checked: true, isPothole: true, severity: 4, confidence: 0.96, reason: 'Large road-surface cavity.' }, upvoteCount: 3, daysOpen: 2, priorityScore: 11.67, reportedBy: { id: '65a000000000000000000001', name: 'Asha Rao', badges: [] } }], pagination: { total: 42, page: 1, limit: 100, pages: 1, hasMore: false } } } } },
          400: errorResponse,
          401: errorResponse,
        },
      },
      post: {
        tags: ['Potholes'],
        summary: 'Create a pothole report',
        description: 'Uploads one JPEG, PNG, or WebP image up to 5 MB. Location is validated; duplicate reports return 409.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo', 'lat', 'lng'],
                properties: {
                  photo: { type: 'string', format: 'binary' },
                  lat: { type: 'number', example: 12.9716 },
                  lng: { type: 'number', example: 77.5946 },
                  description: { type: 'string', maxLength: 300, example: 'Near the bus stop.' },
                  forceNew: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Saved report; AI may be marked unchecked if the service is unavailable.', content: { 'application/json': { example: { message: 'Pothole report submitted successfully.', report: { id: '65a000000000000000000010', status: 'reported', ai: { checked: false, isPothole: false, severity: null, confidence: null, reason: '' } }, pointsAwarded: 0 } } } },
          400: errorResponse,
          401: errorResponse,
          409: { ...errorResponse, description: 'A nearby report may be a duplicate.' },
          413: errorResponse,
          422: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/potholes/nearby': {
      get: {
        tags: ['Potholes'],
        summary: 'Find nearby reports',
        parameters: [
          { in: 'query', name: 'lat', required: true, schema: { type: 'number', minimum: -90, maximum: 90 } },
          { in: 'query', name: 'lng', required: true, schema: { type: 'number', minimum: -180, maximum: 180 } },
          { in: 'query', name: 'radius', schema: { type: 'integer', minimum: 1, maximum: 5000, default: 500 } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 200, default: 100 } },
        ],
        responses: {
          200: { description: 'Distance-sorted page of reports.', content: { 'application/json': { example: { reports: [], count: 0, radius: 500, pagination: { total: 0, page: 1, limit: 100, pages: 0, hasMore: false } } } } },
          400: errorResponse,
        },
      },
    },
    '/api/potholes/{id}': {
      get: {
        tags: ['Potholes'],
        summary: 'Get one pothole report',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }],
        responses: {
          200: { description: 'Report, safe reporter profile, and status timeline.', content: { 'application/json': { example: { report: { id: '65a000000000000000000010', photoUrl: 'https://example.test/uploads/pothole.jpg', status: 'reported', reportedBy: { id: '65a000000000000000000001', name: 'Asha Rao', badges: [] }, statusHistory: [] } } } } },
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/potholes/{id}/upvote': {
      post: {
        tags: ['Potholes'],
        summary: 'Upvote a report',
        security: bearer,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }],
        responses: {
          200: { description: 'Vote recorded; citizen and reporter points are awarded.', content: { 'application/json': { example: { message: 'Upvote added.', pointsAwarded: 1, reporterPointsAwarded: 2 } } } },
          400: errorResponse,
          401: errorResponse,
          409: errorResponse,
          429: errorResponse,
        },
      },
      delete: {
        tags: ['Potholes'],
        summary: 'Remove your upvote',
        security: bearer,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }],
        responses: {
          200: { description: 'Vote removed; previously earned points are retained.', content: { 'application/json': { example: { message: 'Your upvote was removed. Earned points are not taken back.' } } } },
          401: errorResponse,
          404: errorResponse,
          409: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/potholes/{id}/status': {
      patch: {
        tags: ['Potholes'],
        summary: 'Change report status',
        description: 'Authority/admin only. Valid transitions are enforced; fixing/rejecting requires a note.',
        security: bearer,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }],
        requestBody: jsonRequest('StatusRequest', { status: 'verified', note: 'Inspected by the road response team.' }),
        responses: {
          200: { description: 'Status and append-only timeline updated.', content: { 'application/json': { example: { message: 'Pothole report status updated.', report: { id: '65a000000000000000000010', status: 'verified', statusHistory: [{ from: 'reported', to: 'verified', note: 'Inspected by the road response team.' }] }, bonusPointsAwarded: 0 } } } },
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/stats': {
      get: {
        tags: ['Insights'],
        summary: 'Get public accountability statistics',
        responses: {
          200: { description: 'Real report totals and oldest open reports.', content: { 'application/json': { example: { totalReported: 42, totalFixed: 26, percentFixed: 61.9, averageDaysOpen: 4.2, averageDaysToFix: 3.8, slaBreaches: 2, oldestUnfixed: [] } } } },
        },
      },
    },
    '/api/leaderboard': {
      get: {
        tags: ['Insights'],
        summary: 'Get a paginated citizen leaderboard',
        parameters: [
          { in: 'query', name: 'period', schema: { type: 'string', enum: ['weekly', 'all-time'], default: 'all-time' } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
        ],
        security: [{}, ...bearer],
        responses: {
          200: { description: 'Top citizens and optional signed-in citizen rank.', content: { 'application/json': { example: { leaders: [{ id: '65a000000000000000000001', name: 'Asha Rao', points: 42, rank: 1, badges: [] }], currentUser: null, currentUserRank: null, period: 'all-time', pagination: { page: 1, limit: 10, total: 25, pages: 3 } } } } },
          400: errorResponse,
        },
      },
    },
    '/api/city-report': {
      get: {
        tags: ['Insights'],
        summary: 'Get the public city report card',
        responses: {
          200: { description: 'Cached aggregate summary, excluding seeded reports.', content: { 'application/json': { example: { totalReported: 42, totalFixed: 26, percentFixed: 61.9, averageDaysToFix: 3.8, worstAreas: [], topContributors: [], generatedAt: '2026-11-15T00:00:00.000Z' } } } },
        },
      },
    },
    '/api/profile': {
      get: {
        tags: ['Insights'],
        summary: 'Get the signed-in user profile and a page of reports',
        security: bearer,
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: { description: 'Profile, badges, rank, and report page.', content: { 'application/json': { example: { user: { id: '65a000000000000000000001', name: 'Asha Rao', points: 10, badges: [], rank: 3 }, reports: [], pagination: { page: 1, limit: 10, total: 0, pages: 0, hasMore: false } } } } },
          401: errorResponse,
        },
      },
    },
    '/api/analytics': {
      get: {
        tags: ['Insights'],
        summary: 'Get authority analytics and a paginated report page',
        security: bearer,
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
        ],
        responses: {
          200: { description: 'MongoDB aggregations plus the requested report page.', content: { 'application/json': { example: { reportsByStatus: [], reportsOverTime: [], averageDaysToFixBySeverity: [], sla: { openReports: 0, breachedReports: 0, compliancePercent: 100 }, hotspots: [], hotspotAreas: [], reports: [], reportPagination: { page: 1, limit: 50, total: 0, pages: 0 } } } } },
          401: errorResponse,
          403: errorResponse,
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get a page of notifications',
        security: bearer,
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: { description: 'Notifications and unread count.', content: { 'application/json': { example: { notifications: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, pages: 0, hasMore: false } } } } },
          401: errorResponse,
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications read',
        security: bearer,
        responses: {
          200: { description: 'Notifications marked read.', content: { 'application/json': { example: { message: 'All notifications marked as read.', updated: 3 } } } },
          401: errorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Request validation failed.' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
          message: { type: 'string' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80 },
          email: { type: 'string', format: 'email', maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1, maxLength: 72 },
        },
      },
      StatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['reported', 'verified', 'in_progress', 'fixed', 'rejected'] },
          note: { type: 'string', maxLength: 500 },
          afterPhotoUrl: { type: 'string', maxLength: 2048, example: '/uploads/fixed-road.jpg' },
        },
      },
    },
  },
}

export default document

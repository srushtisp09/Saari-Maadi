# Phase 2D: Security, reliability, and engineering quality

## Goal

Harden the existing Sari Maadi API and web app without changing its reporting,
engagement, authority, or analytics workflows. Add safer authentication,
request handling, operational visibility, API documentation, pagination,
offline support, and automated checks.

## Files created or changed

- `server/config/env.js` validates startup configuration; `server/.env.example`
  documents the supported variables.
- `server/middleware/` adds Zod request validation, input sanitization, and
  endpoint-specific rate limits. `server/app.js` adds Helmet, CORS allowlisting,
  redacted structured logs, normalized errors, Swagger, and the central error
  handler.
- `server/services/authTokens.js` adds short-lived access tokens and rotating
  refresh sessions. `server/controllers/authController.js` and auth middleware
  implement refresh, logout, and token checks.
- `server/validation/schemas.js` validates accepted request shapes.
- `server/models/`, controllers, and routes add useful indexes, health checks,
  and pagination. The city report card uses a short-lived in-memory cache.
- `server/openapi.js` documents the API at `/api/docs`.
- `server/tests/securityQuality.test.js` extends Jest/Supertest security and
  API coverage. `e2e/phase2d.spec.js` exercises browser flows and a basic
  accessibility scan; `playwright.config.js` isolates their test server.
- `vite.config.js`, `src/main.jsx`, and `public/offline.html` enable the PWA
  manifest and offline navigation fallback.
- `.github/workflows/ci.yml` runs lint, backend tests, Playwright, and the
  production build for pushes and pull requests.
- `README.md` documents the CI badge, measured coverage, and the run/test
  commands.

## How it works in simple words

Every request passes through security headers, the configured origin check,
structured logging with credentials redacted, and input sanitization. Routes
validate their accepted fields before controllers use them. Sensitive routes
have stricter rate limits. Invalid requests receive a predictable error shape;
production server errors do not include stack traces.

Login returns a 15-minute access token and sets a rotating, HttpOnly refresh
cookie. The browser transparently requests a new access token when needed.
Logout invalidates the session. Password hashes are never included in user
responses.

List APIs return bounded pages. The public city report card is cached briefly,
and database health is included in `/api/health`. Uploaded photos still have
their MIME, signature, and size checks. The browser can install the app and
shows an offline fallback for navigation when the network is unavailable.

```text
Browser request
      |
      v
Security headers + CORS + redacted request log
      |
      v
Sanitize input -> validate schema -> rate-limit sensitive actions
      |
      v
Authenticated/authorized route -> controller -> MongoDB
      |
      v
Consistent response (without stack traces in production)
```

## Problems and fixes

- Validation errors initially described the Zod rule but not its field. The
  response now prefixes the first issue with its field and retains structured
  field-level details.
- A common error wrapper discarded the duplicate-report details attached to
  HTTP 409 responses. It now preserves domain fields while adding the common
  `error` envelope.
- A Mongoose `new` option emitted deprecation warnings. It now uses
  `returnDocument: 'after'`.
- Browser tests use an isolated in-memory database, ports, and upload folder so
  they do not alter development or Atlas data.

## Interview questions this phase can answer

1. What is the difference between a short-lived access token and a refresh
   token?
2. How do rate limits and request schemas reduce abuse and malformed input?
3. Why should validation happen before controller logic?
4. How can error responses be consistent without exposing production internals?
5. Why use database pagination and indexes instead of loading every document?
6. How do browser and API tests complement each other?
7. What do Helmet, a CORS allowlist, and redacted structured logging protect?
8. How does a service worker provide a useful offline fallback?

## Validation commands

```powershell
npm run lint
npm test
npm run test:e2e
npm run build
```

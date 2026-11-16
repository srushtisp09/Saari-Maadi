# Security protections

| Protection | What it mitigates |
| --- | --- |
| Helmet security headers and a restrictive Content Security Policy | Common browser-side injection and clickjacking risks. |
| Explicit CORS origin allowlist loaded from environment | Cross-origin browser requests from untrusted sites. CORS is not a substitute for authentication or CSRF defenses. |
| Per-IP API, login, registration, report-create, and upvote limits | Brute-force attempts and excessive automated request volume. |
| Zod schemas with strict object shapes, type/range constraints, and ObjectId checks | Malformed input, unexpected fields, and operator-shaped request values. |
| Recursive removal of `$` and `.` object keys plus XSS filtering | NoSQL operator injection and stored markup/script injection through accepted text fields. React's normal text escaping remains important. |
| Bcrypt password hashing and password-free response serializers | Disclosure of plaintext credentials and accidental exposure of stored password hashes. |
| 15-minute access JWTs, rotating 7-day HttpOnly/SameSite refresh cookies, token-version checks, and logout revocation | Long-lived bearer-token exposure and reuse of revoked refresh sessions. |
| Role checks on authority/admin routes | Citizens performing staff-only status and analytics operations. |
| Startup validation of secrets, ports, MongoDB URI format, rate-limit settings, model name, and CORS origins | Running with invalid or dangerously incomplete configuration. |
| Central error handling with generic production 5xx responses | Accidental disclosure of stack traces and internal failure details to clients. |
| Pino request logging with authorization, cookie, and Set-Cookie redaction | Credential leakage through routine request logs. |
| Photo MIME allowlist, 5 MB cap, image-signature verification, and isolated upload handling | Oversized uploads, unsupported file formats, and simple content-type spoofing. |
| MongoDB indexes and bounded pagination on list endpoints | Avoidable database work and resource exhaustion from unbounded reads. |
| Database-aware health endpoint | Reporting healthy while the database is unavailable. |
| Development-only demo authority/admin seeding | Inadvertently creating known demo credentials in production. |
| PWA offline fallback excludes API and upload paths | Presenting a failed API request as though it were a cached application page. |

## Operational notes

- Keep `server/.env` private and never commit it. Use `server/.env.example` as
  the variable-name reference.
- Set a unique random `JWT_SECRET` (at least 32 characters) and, when used, a
  separate `JWT_REFRESH_SECRET`.
- Configure `CORS_ORIGINS` with the exact deployed web origins.
- Use HTTPS in production so refresh cookies remain protected in transit.
- XSS filtering is defense in depth; continue rendering user text as text and
  avoid unsafe HTML injection APIs.
- The in-memory rate limiter and city-report cache are per-process. Deployments
  with multiple API instances should use a shared store if globally consistent
  limits or cache invalidation are required.

# Phase 2E — Production deployment and portfolio presentation

## Goal

Make the existing React/Vite and Express/Mongoose application deployable as a
Vercel SPA and a Render web service, use persistent Atlas data and Cloudinary
photos in production, and provide an opt-in demo experience without hardcoded
passwords. The Phase 2A–2D reporting, reward, workflow, and security behavior is
preserved.

## Files changed

- `server/services/photoStorage.js` and
  `server/controllers/potholeController.js` handle signed Cloudinary uploads,
  development-only local persistence, photo comparison, and cleanup.
- `server/config/env.js`, `server/app.js`,
  `server/index.js`, `server/scripts/startProduction.js`, `server/.env.example`,
  and `server/package.json` add
  production-only configuration requirements, Render proxy trust, startup
  demo seeding, and a production start/build command.
- `server/services/authTokens.js` uses secure cross-origin refresh-cookie
  attributes only in production.
- `server/services/demoSeed.js`, `server/scripts/seed.js`, and
  `server/scripts/unseed.js` manage one demo authority, one demo citizen, and
  status-diverse seed reports using passwords supplied by environment.
- `server/controllers/insightsController.js`, `server/controllers/potholeController.js`,
  `server/services/leaderboard.js`, and `server/services/badges.js` include
  demo records in demo-mode portfolio views while excluding seeds otherwise.
- `server/tests/environment.test.js` checks production and demo configuration.
- `server/tests/demoSeed.test.js`, `server/tests/photoStorage.test.js`, and
  `server/tests/securityQuality.test.js` cover demo idempotency, photo
  persistence, and production refresh-cookie behavior.
- `src/auth/api.js`, `src/App.jsx`, and `src/pages/AuthPage.jsx` add the
  configurable API origin, slow-server notice, and opt-in credential panel.
- `client/.env.example`, `render.yaml`, `vercel.json`, `package.json`,
  `server/scripts/build.js`, and `vite.config.js` document or configure the
  two production deployments.
- `README.md` and `docs/screenshots/` contain the portfolio overview and
  screenshot capture list.

## How it works in simple words

The browser sends API calls to the address in `VITE_API_BASE_URL`. Render runs
the API, connects to Atlas using `MONGO_URI`, and stores uploaded photos in
Cloudinary using server-only credentials. Production refuses to start without
the database, Cloudinary, JWT secret, and allowed frontend origin configured.
Local development still supports the existing temporary MongoDB option and
stores photos on disk only when Cloudinary is not configured.

The rotating refresh cookie is `Secure`, `HttpOnly`, and `SameSite=None` in
production so credentialed browser requests can refresh sessions between the
Vercel and Render origins. Local cookies remain `SameSite=Strict`.

When `DEMO_MODE=true`, the API ensures the environment-password-protected demo
authority and citizen accounts exist, then inserts sample reports across all
five statuses if they are not present. Demo records appear in the portfolio
views only while demo mode is enabled. The login panel is a separate public
frontend build setting; its `VITE_DEMO_*` values are intentionally public and
must match the server demo credentials.

## Deployment checklist

Deploy Vercel first to learn its final production domain, then add that exact
origin to Render's `CORS_ORIGINS` value.

### 1. MongoDB Atlas

1. Create a free Atlas project and cluster.
2. Under **Database Access**, create a database user with a strong generated
   password. Do not reuse the Atlas account password.
3. Under **Network Access**, allow Render to connect. For the simplest free
   Render setup with changing outbound IPs, add `0.0.0.0/0`; use a narrower
   allowlist if your plan provides stable outbound IPs.
4. Choose **Connect → Drivers → Node.js** and copy the connection URI. Replace
   the placeholders with the database user/password and database name:

   ```text
   mongodb+srv://<DB_USER>:<URL_ENCODED_DB_PASSWORD>@<CLUSTER_HOST>/sari-maadi?retryWrites=true&w=majority&appName=sari-maadi
   ```

5. Paste this complete URI into Render as `MONGO_URI`. URL-encode special
   characters in the database password. Never commit the URI.

### 2. Cloudinary

1. Create a free Cloudinary account and open **Dashboard → Product
   Environment Credentials**.
2. Copy the following values exactly:
   - `CLOUDINARY_CLOUD_NAME` ← **Cloud name**
   - `CLOUDINARY_API_KEY` ← **API Key**
   - `CLOUDINARY_API_SECRET` ← **API Secret**
3. Add all three as Render environment variables. Do not add the API secret to
   Vercel or a `VITE_*` variable.
4. Uploads remain restricted to one JPEG, PNG, or WebP image up to 5 MB.

### 3. Render (Express web service)

1. In Render, select **New → Blueprint** and connect this repository. The
   included `render.yaml` configures the service as `saari-maadi-api`,
   installs both lockfile dependency sets, starts the backend in production,
   and checks `/api/health`.
2. In the service's **Environment** page, set/paste:

   | Render key | Value to paste |
   | --- | --- |
   | `MONGO_URI` | The full Atlas URI from step 1 |
   | `JWT_SECRET` | A new random string of at least 32 characters; generate locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` |
   | `CORS_ORIGINS` | `https://<your-vercel-project>.vercel.app` (replace with the exact Vercel origin; no path or trailing slash) |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary **Cloud name** |
   | `CLOUDINARY_API_KEY` | Cloudinary **API Key** |
   | `CLOUDINARY_API_SECRET` | Cloudinary **API Secret** |
   | `DEMO_MODE` | `false` to disable demo data, or `true` to seed and expose the portfolio demo |
   | `DEMO_AUTHORITY_PASSWORD` | Your generated demo authority password; required only when `DEMO_MODE=true` |
   | `DEMO_CITIZEN_PASSWORD` | Your generated demo citizen password; required only when `DEMO_MODE=true` |
   | `GEMINI_API_KEY` | Optional Google AI Studio key; leave unset to keep AI assessment disabled |

   `NODE_ENV=production` is set in `render.yaml`. Render supplies `PORT`; do
   not create or hardcode your own `PORT`. `JWT_REFRESH_SECRET` is optional and
   can be left unset. Keep secret values in Render's environment settings.
3. Deploy. Wait for the health check to pass, then verify
   `https://<your-render-service>.onrender.com/api/health` returns
   `{"status":"ok","database":"connected"}`.
4. Record the exact Render origin, for example
   `https://saari-maadi-api.onrender.com`; do not include `/api` in
   `VITE_API_BASE_URL`.

### 4. Vercel (React/Vite SPA)

1. Import the same repository in Vercel. Keep **Root Directory** at the
   repository root (the Vite app is at the root, not inside `client/`).
   `vercel.json` sets `npm run build`, `dist`, and the SPA fallback rewrite.
2. Add these values in **Project → Settings → Environment Variables** for the
   Production environment:

   | Vercel key | Value to paste |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com` (exact Render origin, no `/api` and no trailing slash) |
   | `VITE_DEMO_MODE` | `false` if Render `DEMO_MODE=false`; otherwise `true` |
   | `VITE_DEMO_AUTHORITY_EMAIL` | `authority-demo@sari-maadi.example` |
   | `VITE_DEMO_AUTHORITY_PASSWORD` | Exact same value as Render `DEMO_AUTHORITY_PASSWORD` |
   | `VITE_DEMO_CITIZEN_EMAIL` | `citizen-demo@sari-maadi.example` |
   | `VITE_DEMO_CITIZEN_PASSWORD` | Exact same value as Render `DEMO_CITIZEN_PASSWORD` |

   For a private/non-demo deployment, set `VITE_DEMO_MODE=false` and leave the
   four credential variables empty. When demo mode is on, these frontend
   credentials are public by design. Never copy Atlas, JWT, or Cloudinary
   secrets into Vercel.
3. Deploy, then copy the Vercel production origin (for example
   `https://saari-maadi.vercel.app`) into Render `CORS_ORIGINS`.
4. Save the Render environment change and redeploy/restart the API. Redeploy
   Vercel after changing any `VITE_*` value because Vite embeds those values at
   build time.
5. Test the login panel, map, report detail, authority page, and the health and
   API docs links. The first slow API request displays
   “Waking up the server, this takes up to a minute”.

## Problems and fixes

- **Render returns a CORS error:** set `CORS_ORIGINS` to the exact Vercel
  origin (`https://...`), not the site URL with a path, trailing slash, or
  wildcard. Restart the API after changing it.
- **The service cannot connect to Atlas:** verify the full `MONGO_URI`, URL
  encoding of the DB password, Atlas user permissions, and Atlas Network
  Access. Do not use the Atlas web-console password in the URI.
- **Production fails at startup:** check that `JWT_SECRET` is at least 32
  characters and that `MONGO_URI`, all Cloudinary values, and `CORS_ORIGINS`
  are set. `DEMO_MODE=true` also requires both demo passwords.
- **Photos fail to upload:** confirm all Cloudinary keys came from the same
  Cloudinary product environment and that the free plan has not exhausted its
  quota. Uploads still have the 5 MB and image-type checks.
- **A Vercel deep link returns 404:** keep `vercel.json` at repository root
  and keep the Vercel root directory set to the repository root.
- **The first request is slow:** free Render instances sleep while idle. The
  browser displays the wake-up notice while the API request is pending.
- **Demo panel and API disagree:** keep `VITE_DEMO_MODE` equal to Render
  `DEMO_MODE`; the two demo password values must also match exactly.
- **Refresh sessions do not persist in a browser:** verify cross-origin
  requests use credentials, the Render CORS origin is exact, and the production
  refresh cookie is not blocked by browser third-party-cookie policy. For
  stricter browser privacy settings, use custom frontend/API domains under the
  same registrable domain.

## Interview questions

1. Why use signed server-to-Cloudinary uploads instead of storing production
   photos on an ephemeral Render filesystem?
2. Why does the API require a persistent MongoDB URI in production but allow
   an in-memory database for development and tests?
3. What does Express `trust proxy` change when the service runs behind
   Render's proxy, and why is it enabled only in production?
4. Why must `VITE_*` values be considered public, and which deployment
   secrets stay server-side?
5. How does demo seeding remain opt-in and idempotent across service restarts?
6. How do upload size/type checks and duplicate comparison work with remote
   Cloudinary photos?
7. Why is CORS configured with exact origins instead of a wildcard?
8. How does the backend enforce allowed status transitions and role checks if
   the frontend is modified or bypassed?

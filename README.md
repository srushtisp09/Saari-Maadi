# Sari Maadi

Sari Maadi is a Bengaluru pothole tracker with an animated React landing page, an Express authentication API, AI-assisted pothole reporting, and a community pothole map.

## Run locally

From the project root:

```powershell
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`; `/api` and `/uploads` are proxied to the Express API at `http://localhost:5000`.

The server reads configuration from `server/.env`. The current development configuration uses MongoDB Atlas. If `MONGO_URI` is empty, the server falls back to `mongodb-memory-server`; data is temporary and disappears when the server stops.

Set `GEMINI_API_KEY` in `server/.env` to enable image assessment. The default `GEMINI_MODEL` is `gemini-3.5-flash-lite`, Google's stable, low-cost multimodal model with image input and a standard free tier ([model details](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [pricing](https://ai.google.dev/gemini-api/docs/pricing)). Free-tier quotas and availability can change. Photos that Gemini confirms as potholes earn the reporter 10 points. If Gemini is unavailable, the report is still saved for later review.

Reports within 30 meters are checked for duplicates before saving. A duplicate response includes the existing report; `forceNew=true` lets a citizen confirm that the new photo shows a different pothole. Citizens can upvote another person's report once (+1 point for the voter and +2 for the reporter); removing an upvote does not retract earned points. Open reports include `daysOpen` and `priorityScore` (`severity × 2 + upvotes + min(daysOpen, 30) / 3`).

Run `npm --prefix server run test:gemini` to send the included test photo to Gemini and print its parsed assessment. The API server logs Gemini's HTTP status and error message if an assessment fails; the API key is redacted.

Uploaded images are limited to JPEG, PNG, or WebP and 5 MB, and are stored in the ignored `server/uploads/` directory.

## Map demo data

The map uses Leaflet with OpenStreetMap tiles and needs no map API key. Seed 15 Bengaluru demo reports with `npm run seed`; remove only those demo reports with `npm run unseed`.

## API

- `GET /api/health`
- `POST /api/auth/register` with `{ "name", "email", "password" }`
- `POST /api/auth/login` with `{ "email", "password" }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`
- `POST /api/potholes` (authenticated multipart form: `photo`, `lat`, `lng`, optional `description` and `forceNew`)
- `GET /api/potholes` (newest first; supports `status`, minimum `severity`, `limit`, `page`, `mine=true`, and `sort=priority`)
- `GET /api/potholes/nearby?lat=12.97&lng=77.59&radius=500`
- `GET /api/potholes/:id`
- `POST /api/potholes/:id/upvote` and `DELETE /api/potholes/:id/upvote` (authenticated)
- `GET /api/stats` (excludes demo seed records)

The server can also be started separately with `npm --prefix server run dev`.

## Authority workflow

Authorities and admins can review the urgency-ranked queue at `/authority`.
The lifecycle is `reported -> verified -> in_progress -> fixed`, with
`rejected` as a terminal outcome. Only authorities/admins may change status;
the report owner receives status and 5/10/25-upvote notifications. Fixed
reports award the reporter a one-time 20-point bonus. SLA thresholds are
configured in `server/config/sla.js`.

Run `npm run seed` to create/reset the development authority and admin demo
accounts; their credentials are printed by the command outside production.
Citizens use the normal registration/login flow. Run `npm test` for the
Jest/Supertest API tests. See [Phase 2B details](./docs/PHASE-2B-authority-workflow.md).

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

Uploaded images are limited to JPEG, PNG, or WebP and 5 MB, and are stored in the ignored `server/uploads/` directory.

## Map demo data

The map uses Leaflet with OpenStreetMap tiles and needs no map API key. Seed 15 Bengaluru demo reports with `npm run seed`; remove only those demo reports with `npm run unseed`.

## API

- `GET /api/health`
- `POST /api/auth/register` with `{ "name", "email", "password" }`
- `POST /api/auth/login` with `{ "email", "password" }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`
- `POST /api/potholes` (authenticated multipart form: `photo`, `lat`, `lng`, optional `description`)
- `GET /api/potholes` (newest reports first; supports `status`, minimum `severity`, `limit`, `page`, and `mine=true`)
- `GET /api/potholes/nearby?lat=12.97&lng=77.59&radius=500`
- `GET /api/potholes/:id`

The server can also be started separately with `npm --prefix server run dev`.

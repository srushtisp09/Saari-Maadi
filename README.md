# Sari Maadi

Sari Maadi is a Bengaluru pothole tracker starter with an animated React landing page and an Express authentication API.

## Run locally

From the project root, install dependencies and start both development servers:

```powershell
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`; its `/api` requests are proxied to the API at `http://localhost:5000`.

The server reads configuration from `server/.env`. If `MONGO_URI` is empty, it starts `mongodb-memory-server`; users and other data are temporary and disappear when the server stops. To keep data between runs, set `MONGO_URI` to a MongoDB connection string. Keep the generated `JWT_SECRET` private.

## Authentication API

- `GET /api/health`
- `POST /api/auth/register` with `{ "name", "email", "password" }`
- `POST /api/auth/login` with `{ "email", "password" }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`

The server can also be started separately with `npm --prefix server run dev`.

# Dmonitor backend

Minimal Node/Express backend scaffold for Dmonitor.

Quick start

1. Copy `.env.example` to `.env` and adjust `DATABASE_URL` and `JWT_SECRET`.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Run migrations (requires Postgres):

```bash
npm run migrate
```

4. Start server:

```bash
npm start
```

Endpoints
- `GET /health` — health check
- `GET /api/v1/profile` — protected example endpoint (requires `Authorization: Bearer <jwt>`)

# Dmonitor backend — Local dev & tests

Quick steps to run the backend and integration test locally.

Start Postgres and Redis (Docker):

```bash
docker run --name dmonitor-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dmonitor -p 5432:5432 -d postgres:15
docker run --name dmonitor-redis -p 6379:6379 -d redis:7-alpine
```

Install dependencies and run migrations:

```bash
cd backend
npm install
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/dmonitor
node scripts/migrate.js
```

Start server and worker (dev):

```bash
PORT=4002 NODE_ENV=development node src/index.js &
npm run worker:openmrs &
```

Run the integration test (requires Postgres + Redis running):

```bash
npm run test:integration
```

If you want CI to run integration tests on PRs, see `.github/workflows/backend-integration.yml`.
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
 - `GET /api/v1/profile` — protected example endpoint (requires `Authorization: Bearer <jwt>`)

Patient matching and OpenMRS
- `GET /api/v1/patients/lookup?external_system=...&external_id=...` — find a patient by external mapping
- `POST /api/v1/patients/pair` — body `{patient_id, external_system, external_id}` to pair an internal patient with an external id

To enable OpenMRS adapter (Milestone 3), set the following environment variables before starting the server:

```
OPENMRS_URL=https://openmrs.example.org
OPENMRS_USER=svc_user
OPENMRS_PASS=supersecret
```

When configured, readings are sent to OpenMRS asynchronously after ingestion. Failures are logged but do not block ingestion.

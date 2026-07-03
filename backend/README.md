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

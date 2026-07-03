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

OpenMRS-specific env vars
- `OPENMRS_URL`: base URL for OpenMRS (required to enable adapter)
- `OPENMRS_AUTO_CREATE`: set to `true` to attempt creating missing patients
- `OPENMRS_DEFAULT_IDENTIFIER_TYPE`: name or UUID of the identifier type to use when creating patients. If a name is provided, the adapter will attempt to look up the corresponding UUID via the OpenMRS `identifiertype` endpoint.

Observation mapping
- Postings to `/api/v1/readings` can include `type` (e.g. `glucose`, `hba1c`, `blood_pressure`) and the adapter will map to default LOINC codes and normalize units where possible.

Additional supported `type` values and behavior:
- `glucose`, `blood_glucose`: converts `mmol/L` → `mg/dL` and maps to LOINC `2339-0`.
- `hba1c`, `hb_a1c`: maps to LOINC `4548-4`, unit `%`.
- `blood_pressure`: expects `value` to be `{ systolic, diastolic }` and maps to BP panel `85354-9`.
- `lipid`, `cholesterol`: expects `value` object `{ total, hdl, ldl, triglycerides }`, maps to LOINC `2093-3` for total cholesterol by default.
- `creatinine`: maps to LOINC `2160-0`.
- `heart_rate` / `pulse`: maps to LOINC `8867-4` (beats/min).
- `temperature` / `temp`: maps to LOINC `8310-5` (Celsius by default).

When posting a reading you may include optional `patient_info` in the body (example below) to help the adapter auto-create richer patient records in OpenMRS:

```json
{
	"patient_external_id": "ext-123",
	"value": 5.4,
	"type": "glucose",
	"patient_info": {
		"name": "Jane Doe",
		"gender": "female",
		"birthdate": "1980-01-01",
		"address": { "address1": "123 Main St", "cityVillage": "Anytown" }
	}
}
```

The adapter will use these fields when `OPENMRS_AUTO_CREATE=true` to build the `person` payload for OpenMRS patient creation, and it will attempt to resolve identifier type names to UUIDs when `OPENMRS_DEFAULT_IDENTIFIER_TYPE` is a human-friendly name.
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

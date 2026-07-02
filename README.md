# Dmonitor-plugin

Dmonitor is an external microservice design for glucose monitoring with OpenMRS/Taifa Care integration in Kenya.

This repository contains the implementation plan and a starter backend scaffold for building a secure, scalable service that ingests caregiver app and Bluetooth glucometer data, maps it into OpenMRS, and generates clinician alerts, compliance analytics, and national gateway integration support.

## Contents

- `IMPLEMENTATION_PLAN.md`: detailed task backlog and milestones
- `WORKPLAN.md`: milestone-based project workplan
- `src/`: backend scaffold source code
- `Dockerfile`: container image definition
- `.env.example`: sample environment variable configuration

## Goals

- Secure data ingestion from caregiver mobile apps
- Reliable OpenMRS integration for patient observations and encounters
- Trend and alert computation for early complication detection
- Support for Kenya's national digital health gateway
- Cloud-native deployment and independent scaling

## Getting started

Kustomize overlay for existing Grafana Helm releases

If your cluster uses a Grafana Helm chart, use the kustomize overlay at `manifests/grafana/overlay` to patch the deployed Grafana `Deployment` (looks for the label `app.kubernetes.io/name=grafana`) and mount the provisioning and dashboard ConfigMaps. Apply like this from the repo root:

```bash
kubectl apply -k manifests/grafana/overlay
```

Note: ensure the Grafana Helm release adds the label `app.kubernetes.io/name=grafana` to the Deployment (most official charts do). The overlay adds volume mounts and volumes and sets an annotation to trigger a rollout.

Examples for common charts

There are two ready overlays targeting common Helm charts:

- Official `grafana` chart overlay: `manifests/grafana/overlay/examples/official` (matches `app.kubernetes.io/name=grafana`).
- Bitnami `grafana` chart overlay: `manifests/grafana/overlay/examples/bitnami` (matches `app.kubernetes.io/instance=grafana`).

Use either overlay to patch your installed Grafana release, e.g.: `kubectl apply -k manifests/grafana/overlay/examples/official`.

CI validation and helper script

A CI job validates the overlays on PRs and pushes (`.github/workflows/grafana-overlay-ci.yaml`) using `kustomize build` and a client-side `kubectl apply --dry-run=client`.

There is also a convenience script to autodetect the Grafana release and apply the matching overlay:

```bash
# dry-run (default)
scripts/grafana-overlay-apply.sh

# apply for real
scripts/grafana-overlay-apply.sh --apply

# specify overlay explicitly
scripts/grafana-overlay-apply.sh --overlay manifests/grafana/overlay/examples/official --apply
```

Notes:
- The script requires `kubectl` and `kustomize` in your PATH and access to the cluster via kubeconfig.
- CI runs a client-side dry-run and does not require cluster credentials.

Server-side dry-run CI (staging)

For higher confidence the repo includes a manual workflow that performs a server-side dry-run against a staging cluster. This validates admission controllers, CRDs, and server-side behaviour that client dry-run cannot catch.

Workflow: `.github/workflows/grafana-overlay-server-dryrun.yaml`

Requirements (secrets to populate in GitHub repo for the chosen cloud provider):
- AWS/EKS:
   - `AWS_ROLE_TO_ASSUME` — role ARN the runner assumes via OIDC
   - `AWS_REGION` — region (e.g. `us-east-1`)
   - `EKS_CLUSTER_NAME` — cluster name
- GCP/GKE:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER` — workload identity provider resource
   - `GCP_SA_EMAIL` — service account email
   - `GKE_CLUSTER_NAME`, `GKE_ZONE`, `GCP_PROJECT` — cluster credentials

Usage (manual dispatch in GitHub Actions UI): choose `cloud` (aws|gcp) and `overlay` (official|bitnami|custom). For `custom` set `custom_overlay_path` to the repo-relative overlay directory.

Pull request gate

There is a PR-gated workflow that automatically runs a server-side dry-run against a staging cluster for changes under `manifests/grafana/**`:

- `.github/workflows/grafana-overlay-pr-server-dryrun.yaml` — runs on `pull_request` for manifest changes, authenticates to EKS/GKE via OIDC, verifies required CRDs are present (Prometheus Operator and ExternalSecrets), and performs server-side dry-run for the overlays.

This helps catch API-level or admission-controller issues before merging changes to main.
   npm install
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Smoke tests

- `./scripts/check-service.sh` — checks `/health` and `/version`
- `./scripts/smoke-test.sh` — sends a sample reading upload to `/api/v1/readings`

Use `export JWT_SECRET=...` before executing the smoke test.

Environment and JWKS notes
- For local dev you can use HS256 by setting `JWT_SECRET`.
- For secure production use RS256 with a JWKS provider. Example env vars:

```
JWKS_URI=http://localhost:4000/.well-known/jwks.json
JWT_ISSUER=http://auth.test/
JWT_AUDIENCE=dmonitor-service
```

Run the included JWKS mock server and token generator for integration testing:

```
node scripts/mock-jwks-server.js    # starts JWKS server and writes tmp/private.pem
node scripts/generate-jwt.js       # prints an RS256 token signed by mock key
```

## Local development with Docker

Start Postgres and Redis locally for development using Docker Compose:

```bash
npm run compose:up
# when finished:
npm run compose:down
```

`docker-compose.yml` provides a local Postgres and Redis service for integration testing and local development. When running the compose stack, set `DATABASE_URL` and `REDIS_URL` in your `.env` accordingly (examples are present in `.env.example`).

### Flyway migrations (optional)

This repo includes SQL migrations in the `migrations/` directory. You can run them with the included `migrate` script which applies SQL files to the configured `DATABASE_URL`.

If you prefer Flyway, there's a helper script that runs the Flyway Docker image against your database:

```bash
# Run Flyway using Docker (example)
./scripts/flyway-migrate.sh localhost 5432 dmonitor dmonitor dmonitor
```

### CI integration

A GitHub Actions workflow `Integration Tests` is provided at `.github/workflows/integration.yml`. It spins up Postgres+Redis service containers, runs migrations, starts the service, and exercises an end-to-end flow (patient link → reading → alerts).

## API endpoints

- `GET /health`
- `POST /api/v1/readings`
- `GET /api/v1/readings/:patientId`
- `POST /api/v1/patients/link`
- `GET /api/v1/patients/:id/history`
- `POST /api/v1/sync/status`

- `GET /version`

> Note: API routes are protected by a simple bearer token for the scaffold. Use the `JWT_SECRET` value from `.env` as the bearer token.

## Next steps


If you want automated ChartMuseum or GitHub Pages publishing instead, I can add a workflow for that next.
Prometheus scrape example

If you run Prometheus to scrape metrics from this service, add a job like the following to your Prometheus `scrape_configs`:

```yaml
scrape_configs:
   - job_name: 'dmonitor-service'
      metrics_path: '/metrics'
      static_configs:
         - targets: ['dmonitor-host:3000']
      scheme: 'http'
      relabel_configs: []
```

Ensure Prometheus can reach the service host and port. In Kubernetes, expose `/metrics` via a Service and use a `kubernetes_sd_config`-backed scrape instead.

For a ready-made Kubernetes example (Service + ServiceMonitor + PodMonitor), see `docs/prometheus-k8s.md`.
Manifests you can apply directly are available under `manifests/`.
If you use `kubectl kustomize` or `kubectl apply -k`, a ready overlay is available at `manifests/kustomize`.

Prometheus alert rules are provided under `manifests/alerts/` as a `PrometheusRule` (for Prometheus Operator). A GitHub Actions workflow example to deploy to Kubernetes is at `.github/workflows/deploy-k8s.yaml` (it expects a base64-encoded kubeconfig in `secrets.KUBECONFIG_DATA`).

Helm, OIDC deploy, and dashboards

- A Helm chart is available at `charts/dmonitor` for templated, repeatable deployments.
- An OIDC-friendly GitHub Actions workflow is provided at `.github/workflows/deploy-oidc.yaml` with examples for EKS (AWS) and GKE (GCP).
- A minimal Grafana dashboard JSON is in `dashboards/dmonitor-grafana.json` to import into Grafana.
- An `ExternalSecret` example is in `manifests/externalsecret-example.yaml` showing how to provision OpenMRS credentials from an external secrets store.

Use the Helm chart + OIDC workflow as the recommended production path; keep `manifests/kustomize` for quick local or non-Helm installs.

Helm CI and tests

The repository includes a CI workflow to lint and package the chart (`.github/workflows/helm-chart-ci.yaml`) and a `helm test` Job template at `charts/dmonitor/templates/test-connection-job.yaml` which runs during `helm test` to validate `/health`.

You can run the checks locally:

```bash
helm lint charts/dmonitor
helm package charts/dmonitor -d ./artifacts
helm install --wait --timeout 2m dmonitor charts/dmonitor
helm test dmonitor
```

See `charts/dmonitor/values.schema.json` for a values schema and `dashboards/dmonitor-grafana-extended.json` for a richer dashboard example.

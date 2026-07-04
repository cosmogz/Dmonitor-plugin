# Release runbook

Steps to perform a release safely:

1. Create a GitHub Release (tag) which triggers the `release.yml` workflow.
2. The workflow will optionally run migrations if `PRODUCTION_DATABASE_URL` is set in repository secrets. Ensure this points to the intended DB.
3. The workflow builds and pushes images to GHCR, generates SBOMs, runs Grype/Trivy scans, and publishes the Helm chart.
4. Verify artifacts (SBOMs, Grype reports) in Actions artifacts.
5. Deploy the Helm chart to the target cluster:

```bash
helm repo add dmonitor https://<OWNER>.github.io/<REPO>
helm repo update
helm upgrade --install my-dmonitor charts/dmonitor --set image.tag=<TAG>
```

6. Post-deploy checks:
- Confirm readiness probes pass and pods are running: `kubectl get pods`
- Check `/health` and `/metrics` endpoints.
- Verify critical dashboards and run smoke OTEL check if needed.

Rollback:
- Roll back to a previous chart version with `helm rollback` and run any necessary DB compensations manually.

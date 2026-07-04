# charts/dmonitor

Usage and publishing notes for the `dmonitor` Helm chart.

Installing from GitHub Pages (chart-repo):

1. Add the chart repository:

```bash
helm repo add dmonitor https://<OWNER>.github.io/<REPO>
helm repo update
helm install my-dmonitor dmonitor/dmonitor --version 0.1.0
```

Replace `<OWNER>` and `<REPO>` with your values (e.g. `cosmogz` and `Dmonitor-plugin`).

Publishing as OCI to GHCR (recommended for private charts):

1. Login to GHCR with a token that has `write:packages`:

```bash
echo "$GHCR_TOKEN" | helm registry login ghcr.io --username <username> --password-stdin
```

2. Pull or install an OCI chart:

```bash
helm chart pull ghcr.io/<OWNER>/dmonitor-chart:<TAG>
helm chart export ghcr.io/<OWNER>/dmonitor-chart:<TAG>
helm install my-dmonitor oci://ghcr.io/<OWNER>/dmonitor-chart --version <TAG>
```

Release workflow notes:
- The repository contains GitHub Actions workflows that build images, generate SBOMs, run Trivy, and publish the chart either to GitHub Pages (Chart Releaser) or GHCR as an OCI artifact.
- Ensure `GHCR_TOKEN` (PAT with `write:packages`) is set in repository secrets if `GITHUB_TOKEN` is not permitted for package pushes.

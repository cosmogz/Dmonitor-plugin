# Publishing images and Helm charts

This document explains the minimal secrets and permissions required to publish Docker images (GHCR) and Helm charts for this repository.

1) GitHub Container Registry (GHCR)

- For GitHub Actions you can use the built-in `GITHUB_TOKEN` to authenticate and push images if the workflow permissions include `packages: write`.
- Alternatively, create a Personal Access Token (PAT) with `write:packages` and `repo` scopes and add it as a repository secret (recommended name: `GHCR_TOKEN`).
- In workflows that push images using `docker/build-push-action`, set the login step like:

```yaml
uses: docker/login-action@v2
with:
  registry: ghcr.io
  username: ${{ github.actor }}
  password: ${{ secrets.GHCR_TOKEN }} # or ${{ secrets.GITHUB_TOKEN }} when allowed
```

2) Helm chart publishing (Chart Releaser / GitHub Pages)

- The repository uses the `helm/chart-releaser-action` to publish packaged charts to GitHub Pages. The action can use the `GITHUB_TOKEN` or a PAT stored in `CR_TOKEN`.
- Ensure the `charts_repo_url` value in the workflow is correct for your repository. The default workflow attempts to use `https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}`.

3) Recommended repository secrets and permissions

- `GHCR_TOKEN` (optional): PAT with `write:packages` + `repo` scopes for pushing images. If omitted, `GITHUB_TOKEN` may work depending on your org settings.
- `CR_TOKEN` (optional): PAT for chart-releaser if you prefer a PAT over `GITHUB_TOKEN`.
- Ensure workflows that need registry publishing include `packages: write` under `permissions:`.

4) Notes

- Using `GITHUB_TOKEN` is simplest and avoids creating a PAT, but some orgs disable package write for `GITHUB_TOKEN`. If publishing fails, create a PAT and set `GHCR_TOKEN`/`CR_TOKEN`.
- For OCI-based Helm chart publishing to GHCR, you can also push charts as OCI artifacts using Helm 3.8+ and the `helm push` plugin; that requires a token with `write:packages`.

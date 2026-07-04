# Secrets and credential management

Recommended secrets and patterns for `Dmonitor-plugin`:

- `DATABASE_URL`: Postgres connection string for the environment.
- `REDIS_URL`: Redis connection string.
- `JWT_SECRET`: JWT signing secret.
- `GHCR_TOKEN`: PAT with `write:packages` (optional if `GITHUB_TOKEN` works).
- `CR_TOKEN`: Chart Releaser token (optional).

Best practices:
- Store secrets in GitHub repository or organization Secrets for CI.
- For production, use a secret store like HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets with managed encryption.
- Limit access scope to only the services that require the secret and rotate tokens regularly.

Example Kubernetes secret (create with `kubectl -n monitoring create secret generic dmonitor-secrets --from-literal=DATABASE_URL=...`):

```bash
kubectl create secret generic dmonitor-secrets \
  --from-literal=DATABASE_URL='postgres://user:pass@db:5432/dmonitor' \
  --from-literal=REDIS_URL='redis://redis:6379' \
  --from-literal=JWT_SECRET='REPLACE_ME'
```

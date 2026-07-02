CI secrets and environment variables

For production CI runs and GitHub Actions, prefer using JWKS and not embedding private keys in the repository.

Recommended secrets (GitHub Actions secrets):

- `JWKS_URI` — URL of your JWKS endpoint (for GitHub-hosted test envs, point to your auth provider)
- `JWT_ISSUER` — expected issuer claim in tokens
- `JWT_AUDIENCE` — expected audience claim in tokens
- `OPENMRS_BASE_URL` — base URL for OpenMRS API (if used in CI)
- `OPENMRS_USERNAME` / `OPENMRS_PASSWORD` — basic auth for OpenMRS (if needed). Prefer using a test account with limited scope.
- `DATABASE_URL` — database connection string for test DB (use ephemeral DB in CI)

CI tips:
- For integration tests, start a lightweight JWKS mock (as in `scripts/mock-jwks-server.js`) inside the workflow OR provision a short-lived JWKS URI via your auth provider.
- Use GitHub Actions `secrets` to store production JWKS URLs and OpenMRS credentials — never commit secrets to the repo.
- Consider creating a dedicated test client in your auth provider with limited permissions and short token TTL for CI runs.

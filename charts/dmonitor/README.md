Minimal Helm chart scaffold for dmonitor.

Usage:

```sh
helm install my-dmonitor ./charts/dmonitor
```

OIDC / OAuth integration
-------------------------

This chart includes simple support for configuring an OIDC provider (e.g. Keycloak, Dex) for applications like Grafana.

Configure OIDC in `values.yaml` under the `oidc` block. Example:

```yaml
oidc:
	enabled: true
	provider: keycloak
	issuerUrl: https://auth.example.com
	clientID: my-client-id
	clientSecret:
		create: false
		secretName: grafana-oidc-secret
		secretKey: client-secret
	redirectURI: https://grafana.example.com/login/generic_oauth
	scopes:
		- openid
		- profile
		- email
```

Notes:
- Prefer creating Kubernetes `Secret` objects separately (e.g. via external-secrets, sealed-secrets, or `kubectl create secret`) and reference them with `clientSecret.secretName`.
- If you set `clientSecret.create=true` the chart will create a `Secret` from the provided `clientSecret.value` (not recommended for production).
- When `oidc.enabled` is true the chart will render a `ConfigMap` containing a `grafana.ini` snippet at `{{ include "dmonitor.fullname" . }}-grafana-ini`. You will still need to mount this file into your Grafana deployment or otherwise configure Grafana to read it.

Dmonitor Helm chart

Usage:

```bash
helm install dmonitor charts/dmonitor -n default --create-namespace
```

Values can be overridden with `-f` or `--set` (image.tag, replicaCount, metrics.serviceMonitor.namespace, etc.).

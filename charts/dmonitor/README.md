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

ExternalSecrets
----------------

If you use the ExternalSecrets operator, the chart can create an `ExternalSecret` resource to populate the Kubernetes Secret automatically. Configure the `externalSecrets` block in `values.yaml` or use the provided example in `charts/dmonitor/examples/values-oidc-provisioning.yaml`.

Important: Creating ExternalSecrets from the chart is convenient for demos but in production you may want to manage them separately with proper RBAC and secret store configurations.

SecretStore provider examples
----------------------------

Below are example `SecretStore` / `ClusterSecretStore` snippets for common providers. These are just examples — you must create the `SecretStore` in the cluster and configure provider credentials according to your environment.

AWS Secrets Manager (ClusterSecretStore):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
	name: aws-secrets-manager
spec:
	provider:
		aws:
			service: SecretsManager
			region: us-east-1
			auth:
				secretRef:
					accessKeyIDSecretRef:
						name: aws-creds
						key: accessKeyID
					secretAccessKeySecretRef:
						name: aws-creds
						key: secretAccessKey
```

HashiCorp Vault (SecretStore):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
	name: vault-store
spec:
	provider:
		vault:
			server: https://vault.example.com
			path: secret
			version: "v2"
			auth:
				token:
					secretRef:
						name: vault-token
						key: token
```

GCP Secret Manager (ClusterSecretStore):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
	name: gcp-sm
spec:
	provider:
		gcp:
			projectID: my-gcp-project
			auth:
				secretRef:
					name: gcp-sa
					key: service-account.json
```

Refer to the ExternalSecrets operator documentation for provider-specific configuration and supported auth methods.

Dmonitor Helm chart

Usage:

```bash
helm install dmonitor charts/dmonitor -n default --create-namespace
```

Values can be overridden with `-f` or `--set` (image.tag, replicaCount, metrics.serviceMonitor.namespace, etc.).

Ingress
-------

To expose the service via Ingress, set the `ingress` block in `values.yaml`. Example:

```yaml
ingress:
	enabled: true
	hosts:
		- host: grafana.example.com
			paths:
				- path: /
					pathType: Prefix
	tls:
		- hosts:
				- grafana.example.com
			secretName: grafana-tls
```

The chart renders a `networking.k8s.io/v1` Ingress when `ingress.enabled` is true. Provide annotations and `ingress.className` as needed for your cluster's ingress controller.

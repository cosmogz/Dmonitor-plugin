Dmonitor Helm chart

Usage:

```bash
helm install dmonitor charts/dmonitor -n default --create-namespace
```

Values can be overridden with `-f` or `--set` (image.tag, replicaCount, metrics.serviceMonitor.namespace, etc.).

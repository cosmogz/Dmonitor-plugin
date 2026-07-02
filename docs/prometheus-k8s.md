# Prometheus Kubernetes scrape examples

This file contains example Kubernetes YAML to expose metrics for Prometheus scraping.

## Service (expose the app on cluster network)

Use this `Service` to expose the app's port within the cluster. Prometheus can scrape the `Service` target.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dmonitor-service
  namespace: default
  labels:
    app: dmonitor
spec:
  selector:
    app: dmonitor
  ports:
    - name: http
      protocol: TCP
      port: 3000
      targetPort: 3000
```

Apply the `Service` and ensure your `Deployment` has the `app: dmonitor` label.

## ServiceMonitor (Prometheus Operator)

If you run the Prometheus Operator (kube-prometheus or OpenShift Prometheus), create a `ServiceMonitor` so Prometheus automatically discovers and scrapes metrics from the `Service`.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dmonitor-servicemonitor
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: dmonitor
  namespaceSelector:
    matchNames:
      - default
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
      scheme: http
```

Notes:
- Adjust `namespace` and `matchNames` according to where Prometheus is running and where the service is deployed.
- If your service is exposed via a different port or path, adjust `endpoints` accordingly.

## PodMonitor (optional)

If you prefer scraping pods directly, use a `PodMonitor`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: dmonitor-podmonitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: dmonitor
  namespaceSelector:
    matchNames:
      - default
  podMetricsEndpoints:
    - port: http
      path: /metrics
      interval: 15s
```

## Security
- Ensure `/metrics` does not expose sensitive information. Prometheus should scrape metrics from a trusted network.
- Consider network policies to restrict access to the metrics endpoint.

## References
- Prometheus Operator `ServiceMonitor`: https://github.com/prometheus-operator/prometheus-operator
- Prometheus scrape config: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config

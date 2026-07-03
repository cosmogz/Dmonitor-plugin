# Changelog for dmonitor Helm chart

All notable changes to this chart will be documented in this file.

## [0.1.1] - 2026-07-03
### Added
- Helm chart scaffold: Deployment, Service, ServiceAccount
- Grafana OIDC config rendering via ConfigMap
- Grafana provisioning and dashboard ConfigMaps
- ExternalSecrets support and example
- HorizontalPodAutoscaler and Ingress templates
- CI: helm lint and template validations, overlay server-dry-run gating

## [0.1.0] - Initial development
- Initial chart creation and early templates

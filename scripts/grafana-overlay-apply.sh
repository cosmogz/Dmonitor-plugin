#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [--overlay <path>] [--apply]

Options:
  --overlay <path>   Use a specific overlay path instead of autodetection
  --apply            Actually apply the overlay (default is dry-run)
  -h, --help         Show this help

This script autodetects a Grafana Deployment in the cluster and applies
an appropriate kustomize overlay to mount provisioning and dashboard ConfigMaps.
EOF
}

OVERLAY=""
APPLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --overlay)
      OVERLAY="$2"
      shift 2
      ;;
    --apply)
      APPLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$OVERLAY" ]]; then
  echo "Detecting Grafana Deployment label..."
  if kubectl get deployment -A -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].metadata.name}' >/dev/null 2>&1; then
    OVERLAY="manifests/grafana/overlay/examples/official"
    echo "Detected official Grafana chart label (app.kubernetes.io/name=grafana). Using overlay: $OVERLAY"
  elif kubectl get deployment -A -l app.kubernetes.io/instance=grafana -o jsonpath='{.items[0].metadata.name}' >/dev/null 2>&1; then
    OVERLAY="manifests/grafana/overlay/examples/bitnami"
    echo "Detected Bitnami Grafana chart label (app.kubernetes.io/instance=grafana). Using overlay: $OVERLAY"
  else
    echo "No Grafana deployment detected by standard labels. Please specify --overlay <path>."
    exit 1
  fi
fi

if [[ "$APPLY" = true ]]; then
  echo "Applying overlay $OVERLAY to the cluster (server-side apply)..."
  kustomize build "$OVERLAY" | kubectl apply -f -
  echo "Applied overlay."
else
  echo "Doing client-side dry-run for overlay $OVERLAY (no changes will be made)."
  kustomize build "$OVERLAY" | kubectl apply --dry-run=client -f -
  echo "Dry-run complete. To apply for real add the --apply flag."
fi

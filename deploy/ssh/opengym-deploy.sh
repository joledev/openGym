#!/bin/bash
# Forced command for the CI deploy key. It accepts exactly:
#   deploy sha256:<64 hex> sha256:<64 hex>
# and updates the two Deployments by digest. It never runs arbitrary commands.
set -euo pipefail
LOG=/home/joel/opengym-deploy.log
ENV_FILE=/home/joel/opengym.env
export KUBECONFIG=/home/joel/.kube/opengym-ci
log() { printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "$LOG"; }

cmd="${SSH_ORIGINAL_COMMAND:-}"
read -r action api web extra <<< "$cmd"
if [[ "$action" != "deploy" || -n "${extra:-}" ]]; then
    log "refused: ${cmd:-<empty>}"; exit 2
fi
if [[ ! "$api" =~ ^sha256:[0-9a-f]{64}$ || ! "$web" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    log "bad digest: api=${api:-<empty>} web=${web:-<empty>}"; exit 2
fi
# Only HEALTH_URL is read from the env file; it is never sourced as shell code.
if [[ ! -r "$ENV_FILE" ]]; then log "missing $ENV_FILE"; exit 2; fi
HEALTH_URL="$(sed -n 's/^HEALTH_URL=//p' "$ENV_FILE" | head -n1)"
if [[ ! "$HEALTH_URL" =~ ^https://[A-Za-z0-9._:-]+/ ]]; then
    log "bad HEALTH_URL"; exit 2
fi

prev_api="$(kubectl -n opengym get deploy opengym-api -o jsonpath='{.spec.template.spec.containers[0].image}')"
prev_web="$(kubectl -n opengym get deploy opengym-web -o jsonpath='{.spec.template.spec.containers[0].image}')"
rollback() {
    log "ROLLBACK api=$prev_api web=$prev_web"
    kubectl -n opengym set image deployment/opengym-api api="$prev_api" || true
    kubectl -n opengym set image deployment/opengym-web web="$prev_web" || true
    kubectl -n opengym rollout status deployment/opengym-api --timeout=180s || true
    kubectl -n opengym rollout status deployment/opengym-web --timeout=180s || true
}
trap rollback ERR

log "deploy api=$api web=$web"
kubectl -n opengym set image deployment/opengym-api api="ghcr.io/joledev/opengym-api@$api"
kubectl -n opengym rollout status deployment/opengym-api --timeout=300s
kubectl -n opengym set image deployment/opengym-web web="ghcr.io/joledev/opengym-web@$web"
kubectl -n opengym rollout status deployment/opengym-web --timeout=300s
curl -fsS --max-time 15 "$HEALTH_URL" >/dev/null
log "ok"

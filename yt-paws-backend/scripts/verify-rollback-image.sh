#!/usr/bin/env bash
set -euo pipefail
: "${ROLLBACK_IMAGE:?ROLLBACK_IMAGE must be an immutable image reference containing @sha256:}"
case "$ROLLBACK_IMAGE" in *@sha256:*) ;; *) echo "ROLLBACK_IMAGE must use a digest, not a mutable tag" >&2; exit 1;; esac
docker pull "$ROLLBACK_IMAGE"
docker image inspect "$ROLLBACK_IMAGE" --format '{{json .RepoDigests}}'
echo "Image verified. Promote this exact digest through the hosting platform's protected rollback action, then verify /health/ready and payment webhooks."

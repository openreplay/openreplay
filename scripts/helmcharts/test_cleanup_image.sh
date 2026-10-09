#!/usr/bin/env bash
# Guards against issue #4964: after the RustFS migration, `openreplay --cleanup`
# derived the cleanup Pod image from .minio.image, which now points at the RustFS
# server image (rustfs/rustfs) that ships no bash and no `mc`. The Pod must instead
# use the S3 client image (.minio.migrationImage -> ghcr.io/openreplay/minio:2025).
# Run: bash test_cleanup_image.sh   (needs yq on PATH)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CLI="${HERE}/openreplay-cli"
DEFAULT_IMAGE="ghcr.io/openreplay/minio:2025"

# Load only the pure resolver out of the CLI without executing the whole script.
eval "$(awk '/^function resolve_minio_client_image\(\)/,/^}/' "$CLI")"
if ! declare -F resolve_minio_client_image >/dev/null; then
  echo "FAIL: resolve_minio_client_image not defined in ${CLI}"
  exit 1
fi

fails=0
check() { # name want vars.yaml-body
  local name=$1 want=$2 body=$3
  local vf; vf="$(mktemp)"
  printf '%s\n' "$body" >"$vf"
  local got; got="$(resolve_minio_client_image "$vf")"
  rm -f "$vf"
  if [ "$got" = "$want" ]; then echo "PASS: $name"; else
    echo "FAIL: $name (want '$want' got '$got')"; fails=$((fails+1)); fi
}

# A: stock vars.yaml has no minio image pins -> fall back to the client image.
check "default falls back to client image" "$DEFAULT_IMAGE" \
  'minio:
  enabled: true'

# B: airgap bundle pins a private registry/tag under migrationImage -> use it
# verbatim. (The chart renders this image as registry/repository:tag only - see
# openreplay/templates/job.yaml:419 - so there is no digest form to honor.)
check "airgap migrationImage pin is honored" "registry.local/openreplay/minio:2025" \
  'minio:
  migrationImage:
    registry: registry.local/openreplay
    repository: minio
    tag: "2025"'

# C: #4964 regression — .minio.image is the RustFS server image. It must be ignored.
check "rustfs server image is never used for cleanup" "$DEFAULT_IMAGE" \
  'minio:
  image:
    registry: docker.io
    repository: rustfs/rustfs
    tag: "1.0.0-beta.1"'

if [ "$fails" -ne 0 ]; then echo "FAILED ($fails)"; exit 1; fi
echo "ALL PASS"

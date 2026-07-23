#!/bin/sh
# s6 oneshot: convert each mounted, already-envsubst'd docker-envs/<worker>.env
# into a per-worker s6 envdir at /work/env/<worker>/ (filename=VAR, content=value).
# Each longrun then does `s6-envdir /work/env/<worker>` so workers keep isolated
# env — notably the differing BUCKET_NAME — instead of one merged container env.
set -eu

SRC="${OR_ENVS_DIR:-/work/docker-envs}"
DST=/work/env
# S3-using workers must reach minio inside the compose network, not the
# browser-facing COMMON_DOMAIN_NAME baked into the .env files.
MINIO_ENDPOINT="${OR_MINIO_ENDPOINT:-http://minio.db.svc.cluster.local:9000}"

for w in http ender sink storage db assets; do
  f="$SRC/$w.env"
  [ -f "$f" ] || { echo "[init-envdirs] missing $f, skipping"; continue; }
  d="$DST/$w"
  rm -rf "$d"; mkdir -p "$d"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) : ;; *) continue ;; esac
    key=${line%%=*}
    val=${line#*=}
    # strip one layer of surrounding double quotes
    val=$(printf '%s' "$val" | sed -e 's/^"//' -e 's/"$//')
    printf '%s' "$val" > "$d/$key"
  done < "$f"
  case "$w" in
    http|storage|assets) printf '%s' "$MINIO_ENDPOINT" > "$d/AWS_ENDPOINT" ;;
  esac
  echo "[init-envdirs] built envdir for $w ($(ls "$d" | wc -l) vars)"
done

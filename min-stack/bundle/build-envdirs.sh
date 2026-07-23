#!/bin/sh
# s6 oneshot: convert each mounted, already-envsubst'd docker-envs/<worker>.env
# into a per-worker s6 envdir at /work/env/<worker>/ (filename=VAR, content=value).
# Each longrun then does `s6-envdir /work/env/<worker>` so workers keep isolated
# env — notably the differing BUCKET_NAME — instead of one merged container env.
set -eu

SRC="${OR_ENVS_DIR:-/work/docker-envs}"
DST=/work/env
SHARED_ENV="${OR_SHARED_ENV:-/work/shared.env}"
# S3-using workers must reach minio inside the compose network, not the
# browser-facing COMMON_DOMAIN_NAME baked into the .env files.
MINIO_ENDPOINT="${OR_MINIO_ENDPOINT:-http://minio.db.svc.cluster.local:9000}"

# Parse KEY=VALUE lines from $1 into envdir $2 (strips one layer of quotes).
envfile_to_dir() {
  _f=$1; _d=$2
  rm -rf "$_d"; mkdir -p "$_d"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) : ;; *) continue ;; esac
    key=${line%%=*}
    val=${line#*=}
    val=$(printf '%s' "$val" | sed -e 's/^"//' -e 's/"$//')
    printf '%s' "$val" > "$_d/$key"
  done < "$_f"
}

# Shared constants (topics, groups, tunables) every worker needs.
if [ -f "$SHARED_ENV" ]; then
  envfile_to_dir "$SHARED_ENV" "$DST/_shared"
  echo "[init-envdirs] built _shared envdir ($(ls "$DST/_shared" | wc -l) vars)"
fi

for w in http ender sink storage db assets; do
  f="$SRC/$w.env"
  [ -f "$f" ] || { echo "[init-envdirs] missing $f, skipping"; continue; }
  d="$DST/$w"
  envfile_to_dir "$f" "$d"
  # SERVICE_NAME is required and differs per worker.
  printf '%s' "$w" > "$d/SERVICE_NAME"
  case "$w" in
    http|storage|assets) printf '%s' "$MINIO_ENDPOINT" > "$d/AWS_ENDPOINT" ;;
  esac
  echo "[init-envdirs] built envdir for $w ($(ls "$d" | wc -l) vars)"
done

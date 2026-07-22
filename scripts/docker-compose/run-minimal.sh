#!/usr/bin/env bash
# Boot the minimal FOSS ingest stack (http, ender, sink, storage, db, assets)
# from a throwaway workdir, mirroring the full install.sh env flow:
#   source common env -> envsubst the worker env files -> compose up.
#
# Usage:
#   ./run-minimal.sh up        # build workdir + start (default)
#   ./run-minimal.sh down      # stop and remove volumes
#   ./run-minimal.sh seed      # insert a default project so ingest works
#
# Env values come from minimal.common.env (copy from the .example first).
set -Eeuo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${OR_MINIMAL_WORKDIR:-/tmp/or-minimal}"
ENV_FILE="${SRC_DIR}/minimal.common.env"
PROJECT_KEY="${OR_PROJECT_KEY:-testkey0000000000001}"

[ -f "$ENV_FILE" ] || {
  echo "Missing $ENV_FILE — copy it first:"
  echo "  cp ${SRC_DIR}/minimal.common.env.example ${ENV_FILE}"
  exit 1
}

compose() { docker compose --env-file "${WORK_DIR}/common.env" -f "${WORK_DIR}/docker-compose.yaml" "$@"; }

build_workdir() {
  rm -rf "$WORK_DIR"; mkdir -p "$WORK_DIR"
  cp "${SRC_DIR}/docker-compose.minimal.yaml" "${WORK_DIR}/docker-compose.yaml"
  cp -r "${SRC_DIR}/docker-envs" "${SRC_DIR}/migration-files" "$WORK_DIR/"
  cp "$ENV_FILE" "${WORK_DIR}/common.env"
  # Expand ${COMMON_*} placeholders in each worker env file, as install.sh does.
  set -a; . "${WORK_DIR}/common.env"; set +a
  ln -sf common.env "${WORK_DIR}/.env"
  for f in "${WORK_DIR}"/docker-envs/*.env; do
    envsubst < "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  done
}

seed_project() {
  echo "Seeding project_key=${PROJECT_KEY} ..."
  compose exec -T -e PGPASSWORD="${COMMON_PG_PASSWORD}" postgresql \
    psql -U postgres -tAc \
    "INSERT INTO projects (name, active, project_key)
     VALUES ('minimal-smoke', true, '${PROJECT_KEY}')
     ON CONFLICT (project_key) DO NOTHING
     RETURNING project_id, project_key;"
}

case "${1:-up}" in
  up)
    build_workdir
    COMPOSE_PROFILES=migration compose up -d
    echo "Waiting for Postgres schema (db-migration) ..."
    until compose ps db-migration --format '{{.State}}' 2>/dev/null | grep -q exited; do sleep 2; done
    set -a; . "${WORK_DIR}/common.env"; set +a
    seed_project || true
    echo "Up. http ingest on host port ${HTTP_PORT:-8080}."
    ;;
  seed)
    set -a; . "${WORK_DIR}/common.env"; set +a
    seed_project
    ;;
  down)
    compose down -v
    ;;
  *)
    echo "usage: $0 {up|down|seed}"; exit 1;;
esac

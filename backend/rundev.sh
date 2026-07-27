#!/bin/bash
set -euo pipefail

DB_NAMESPACE="db"
APP_NAMESPACE="app"
STATE_FILE="/tmp/k8s_pf_logs.txt"
ENV_FILE=".env"

if [[ -n "${KUBECONFIG:-}" ]]; then
  export KUBECONFIG="$KUBECONFIG"
else
  unset KUBECONFIG
fi

cleanup() {
  if [[ -f "$STATE_FILE" ]]; then
    echo "[🧹] Cleaning up old port-forwards..."
    while read -r pid; do
      kill "$pid" 2>/dev/null || true
    done < "$STATE_FILE"
    rm -f "$STATE_FILE"
  else
    echo "[ℹ️] No existing port-forwards found."
  fi
  echo "[🧹] Removing $ENV_FILE"
  rm -f "$ENV_FILE"
}

forward_services() {
  local namespace="$1"
  shift
  local entries=("$@")

  echo "[ℹ️] Discovering services in '$namespace'..."
  local svc_file="/tmp/svc_list_${namespace}.json"
  kubectl get svc -n "$namespace" -o json > "$svc_file"

  for entry in "${entries[@]}"; do
    local svc_key="${entry%%:*}"
    local temp="${entry#*:}"
    local local_port="${temp%%:*}"
    local remote_port="${entry##*:}"

    local svc_name
    svc_name=$(jq -r --arg key "$svc_key" '
      .items[] |
      select(.metadata.name | test($key; "i")) |
      .metadata.name
    ' "$svc_file" | head -n 1)

    if [ -z "$svc_name" ]; then
      echo "[⚠️] No match found for service: $svc_key in $namespace"
      continue
    fi

    echo "[✅] Forwarding $namespace/$svc_name:$remote_port → localhost:$local_port"
    kubectl port-forward "svc/$svc_name" "$local_port:$remote_port" -n "$namespace" > "/tmp/${svc_key}.log" 2>&1 &
    echo $! >> "$STATE_FILE"
  done
}

prepare() {
  SERVICE_SHORTNAME="$1"
  APP_SVC_NAME="${SERVICE_SHORTNAME}-openreplay"

  DB_SERVICES=(
    "postgres:5432:5432"
    "clickhouse:9001:9000"
    "clickhouse:8140:8123"
    "redis:6379:6379"
    "kafka:9092:9092"
    "minio:9002:9000"
  )

  APP_SERVICES=(
    "assist:9005:9001"
  )

  : > "$STATE_FILE"
  forward_services "$DB_NAMESPACE" "${DB_SERVICES[@]}"
  forward_services "$APP_NAMESPACE" "${APP_SERVICES[@]}"

  sleep 2
  echo "[ℹ️] Getting env vars for app service: $APP_SVC_NAME"

  ENV_OUTPUT=$(kubectl get deployment "$APP_SVC_NAME" -n "$APP_NAMESPACE" -o json)

  get_env_value() {
    local env_name="$1"
    local env_data=$(echo "$ENV_OUTPUT" | jq -r --arg name "$env_name" '
      .spec.template.spec.containers[].env[] |
      select(.name == $name)
    ')

    if [[ -z "$env_data" ]]; then
      echo ""
      return
    fi

    local direct_value=$(echo "$env_data" | jq -r '.value // empty')
    if [[ -n "$direct_value" ]]; then
      echo "$direct_value"
      return
    fi

    local secret_name=$(echo "$env_data" | jq -r '.valueFrom.secretKeyRef.name // empty')
    local secret_key=$(echo "$env_data" | jq -r '.valueFrom.secretKeyRef.key // empty')

    if [[ -n "$secret_name" && -n "$secret_key" ]]; then
      kubectl get secret "$secret_name" -n "$APP_NAMESPACE" -o jsonpath="{.data.$secret_key}" 2>/dev/null | base64 -d 2>/dev/null || echo ""
    else
      echo ""
    fi
  }

  pg_password=$(get_env_value "pg_password")
  if [[ -z "${pg_password:-}" ]]; then
    echo "[⚠️] pg_password not found in deployment. Using fallback."
    pg_password="postgres"
  fi

  jwt_secret=$(get_env_value "JWT_SECRET")
  if [[ -z "${jwt_secret:-}" ]]; then
    echo "[⚠️] JWT_SECRET not found in deployment. Using fallback."
    jwt_secret="openreplay"
  fi

  ENV_NAMES=$(echo "$ENV_OUTPUT" | jq -r '
    .spec.template.spec.containers[].env[].name
  ' 2>/dev/null)

  ENV_VARS=""
  while read -r name; do
    [[ -z "$name" ]] && continue
    value=$(get_env_value "$name")
    ENV_VARS+="${name}=${value}"$'\n'
  done <<< "$ENV_NAMES"

  echo "[ℹ️] Writing environment variables to $ENV_FILE"
  : > "$ENV_FILE"

  echo "SERVICE_NAME=\"$SERVICE_SHORTNAME\"" >> "$ENV_FILE"
  echo "HOSTNAME=\"$APP_SVC_NAME\"" >> "$ENV_FILE"
  echo "FS_DIR=/tmp/or/efs/" >> "$ENV_FILE"
  echo "FILE_SPLIT_SIZE=1000000" >> "$ENV_FILE"
  echo "BEACON_SIZE_LIMIT=1000000" >> "$ENV_FILE"
  echo "UAPARSER_FILE=/tmp/or/extra/regexes.yaml" >> "$ENV_FILE"
  echo "MAXMINDDB_FILE=/tmp/or/extra/geoip.mmdb" >> "$ENV_FILE"
  echo "HTTP_PORT=8080" >> "$ENV_FILE"
  echo "LOG_QUEUE_STATS_INTERVAL_SEC=60" >> "$ENV_FILE"
  echo "DB_BATCH_QUEUE_LIMIT=20" >> "$ENV_FILE"
  echo "DB_BATCH_SIZE_LIMIT=10000000" >> "$ENV_FILE"
  echo "ASSETS_SIZE_LIMIT=60291456" >> "$ENV_FILE"
  echo "PARTITIONS_NUMBER=16" >> "$ENV_FILE"
  echo "FS_ULIMIT=10000" >> "$ENV_FILE"
  echo "CACHE_ASSETS=true" >> "$ENV_FILE"
  echo "REDIS_STREAMS_MAX_LEN=10000" >> "$ENV_FILE"
  echo "TOPIC_RAW_WEB=raw" >> "$ENV_FILE"
  echo "TOPIC_RAW_IOS=raw-ios" >> "$ENV_FILE"
  echo "TOPIC_RAW_IMAGES=raw-images" >> "$ENV_FILE"
  echo "TOPIC_CACHE=cache" >> "$ENV_FILE"
  echo "TOPIC_ANALYTICS=analytics" >> "$ENV_FILE"
  echo "TOPIC_TRIGGER=trigger" >> "$ENV_FILE"
  echo "TOPIC_MOBILE_TRIGGER=mobile-trigger" >> "$ENV_FILE"
  echo "TOPIC_CANVAS_IMAGES=canvas-images" >> "$ENV_FILE"
  echo "TOPIC_CANVAS_TRIGGER=canvas-trigger" >> "$ENV_FILE"
  echo "GROUP_SINK=sink" >> "$ENV_FILE"
  echo "GROUP_STORAGE=storage" >> "$ENV_FILE"
  echo "GROUP_DB=db" >> "$ENV_FILE"
  echo "GROUP_ENDER=ender" >> "$ENV_FILE"
  echo "GROUP_CACHE=cache" >> "$ENV_FILE"
  echo "GROUP_IMAGE_STORAGE=image-storage" >> "$ENV_FILE"
  echo "GROUP_CANVAS_IMAGE=canvas-image" >> "$ENV_FILE"
  echo "GROUP_CANVAS_VIDEO=canvas-video" >> "$ENV_FILE"
  echo "JWT_SECRET=\"$jwt_secret\"" >> "$ENV_FILE"
  echo "USE_CORS=true" >> "$ENV_FILE"
  echo "BUCKET_NAME=spot" >> "$ENV_FILE"
  echo "KAFKA_MAX_POLL_INTERVAL_MS=300000" >> "$ENV_FILE"
  echo "KAFKA_USE_KERBEROS=false" >> "$ENV_FILE"
  echo "ASSIST_SECRET=\"test-assist-secret\"" >> "$ENV_FILE"
  echo "ASSIST_TTL=\"48\"" >> "$ENV_FILE"

  while read -r line; do
    [[ -z "$line" ]] && continue
    name="${line%%=*}"
    [[ -z "$name" ]] && continue
    value="${line#*=}"

    case "$name" in
      POSTGRES_STRING)
        value="postgres://postgres:${pg_password}@localhost:5432/postgres"
        ;;
      REDIS_STRING)
        value="redis://localhost:6379"
        ;;
      AWS_ENDPOINT)
        value="http://localhost:9002"
        ;;
      KAFKA_SERVERS)
        value="localhost:9092"
        ;;
      CLICKHOUSE_STRING)
        value="localhost:9001/default"
        ;;
      ASSIST_URL)
        value="http://localhost:9005/assist/%s"
        ;;
      JWT_SECRET)
        continue
        ;;
    esac

    echo "$name=\"$value\"" >> "$ENV_FILE"
  done <<< "$ENV_VARS"

  echo "[✅] .env file ready."
}


run_with_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "[❌] $ENV_FILE not found. Run './$0 prepare <app>' first."
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$ENV_FILE"

  if [[ -z "${SERVICE_NAME:-}" ]]; then
    echo "[❌] SERVICE_NAME not set. Aborting."
    exit 1
  fi

  GO_MAIN_PATH="cmd/${SERVICE_NAME}/main.go"

  if [[ ! -f "$GO_MAIN_PATH" ]]; then
    echo "[❌] Go file not found: $GO_MAIN_PATH"
    exit 1
  fi

  fs_dir=$(grep '^FS_DIR=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')

  if [[ -n "$fs_dir" ]]; then
    mkdir -p "$fs_dir"
  fi

  echo "[🚀] Running: go run $GO_MAIN_PATH"
  # shellcheck disable=SC2046
  env $(grep -v '^#' "$ENV_FILE" | xargs) go run "$GO_MAIN_PATH"
}

print_help() {
  echo ""
  echo "Usage:"
  echo "  ./rundev.sh prepare <app>   Forward ports and generate .env from Kubernetes deployment"
  echo "  ./rundev.sh run <app>       Cleanup, prepare, and run your Go app"
  echo "  ./rundev.sh run             Run the Go app using an existing .env file"
  echo "  ./rundev.sh clear           Stop port-forwards and delete .env file"
  echo "  ./rundev.sh help            Show this help message"
  echo ""
}

if [[ $# -eq 0 ]]; then
  print_help
  exit 0
fi

case "${1:-}" in
  prepare)
    if [ -z "${2:-}" ]; then
      echo "[❌] Usage: $0 prepare <app>"
      exit 1
    fi
    cleanup
    prepare "$2"
    ;;
  run)
    if [[ -n "${2:-}" ]]; then
      cleanup
      prepare "$2"
    fi
    run_with_env_file
    ;;
  clear)
    cleanup
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    echo "[❌] Unknown command: $1"
    print_help
    exit 1
    ;;
esac

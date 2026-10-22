#! /bin/sh
# Usage: .dev/run-dev.sh <api|tasks>
# Runs the given service with hot-code-reload (air), using .dev/.air-<service>.toml and .env.
SERVICE="$1"
case "$SERVICE" in
  api|tasks) ;;
  *)
    echo "Usage: $0 <api|tasks>" >&2
    exit 1
    ;;
esac
exec air -c ".dev/.air-$SERVICE.toml"

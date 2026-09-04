#!/usr/bin/env bash
#
# OpenReplay docker-compose upgrade bootstrapper.
#
# Upgrades an EXISTING docker-compose install to a newer version while
# preserving its secrets, passwords, domain and data volumes. Unlike
# install.sh (greenfield), this carries the current common.env forward.
#
# One-liner:
#   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/openreplay/openreplay/main/scripts/docker-compose/docker-upgrade.sh)" -- -b <tag> -d <install-dir>
#
set -Eeuo pipefail

REPO_URL_DEFAULT="https://github.com/openreplay/openreplay"
REPO_BRANCH_DEFAULT="main"
CLONE_DIR_DEFAULT="openreplay"

COLOR_ENABLED=0
if [[ -t 2 ]] && command -v tput >/dev/null 2>&1; then
	if [[ "$(tput colors 2>/dev/null || true)" -ge 8 ]]; then
		COLOR_ENABLED=1
	fi
fi

info() {
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then printf '\033[0;32m[INFO] %s\033[0m\n' "$*" >&2
	else printf '[INFO] %s\n' "$*" >&2; fi
}
warn() {
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then printf '\033[0;33m[WARN] %s\033[0m\n' "$*" >&2
	else printf '[WARN] %s\n' "$*" >&2; fi
}
die() {
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then printf '\033[0;31m[ERROR] %s\033[0m\n' "$*" >&2
	else printf '[ERROR] %s\n' "$*" >&2; fi
	exit 1
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "$2"; }

docker_preflight() {
	require_cmd docker "Docker is not installed. Install Docker and rerun."
	docker info >/dev/null 2>&1 || die "Docker daemon not reachable. Ensure Docker is running and your user has permissions."
	if docker compose version >/dev/null 2>&1; then
		info "Docker Compose plugin detected (docker compose)."
	elif command -v docker-compose >/dev/null 2>&1; then
		info "Legacy Docker Compose detected (docker-compose)."
	else
		die "Docker Compose not found. Install the 'docker compose' plugin and rerun."
	fi
}

usage() {
	cat >&2 <<'EOF'
Usage: docker-upgrade.sh [-b <version>] [-d <dir>] [options]

Upgrades an existing OpenReplay docker-compose install in place, carrying
its current common.env (secrets, passwords, domain) forward.

Options:
  -b, --branch <name>   Git tag/branch to upgrade to (default: main)
  -d, --dir <path>      Existing install directory (default: ./openreplay)
  -r, --repo-url <url>  Repo URL (default: openreplay/openreplay)
  -y, --yes             Non-interactive; assume yes
  -h, --help            Show this help
EOF
}

REPO_URL="$REPO_URL_DEFAULT"
REPO_BRANCH="${REPO_BRANCH:-$REPO_BRANCH_DEFAULT}"
CLONE_DIR="${CLONE_DIR:-$CLONE_DIR_DEFAULT}"
NON_INTERACTIVE=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		-b|--branch)   REPO_BRANCH="${2:-}"; shift 2 ;;
		-d|--dir)      CLONE_DIR="${2:-}"; shift 2 ;;
		-r|--repo-url) REPO_URL="${2:-}"; shift 2 ;;
		-y|--yes)      NON_INTERACTIVE=1; shift ;;
		-h|--help)     usage; exit 0 ;;
		*)             die "Unknown argument: $1" ;;
	esac
done

# Interactive prompts (mirrors docker-install.sh): only on a real TTY.
if [[ "$NON_INTERACTIVE" -eq 0 ]] && [[ -t 0 ]]; then
	read -rp "Enter the version to upgrade to (default is '$REPO_BRANCH'): " _branch
	REPO_BRANCH="${_branch:-$REPO_BRANCH}"
	read -rp "Enter the existing install directory (default is '$CLONE_DIR'): " _dir
	CLONE_DIR="${_dir:-$CLONE_DIR}"
fi

[[ -n "$REPO_BRANCH" ]] || die "Target version cannot be empty."
[[ -n "$CLONE_DIR" ]]   || die "Install directory cannot be empty."
[[ -n "$REPO_URL" ]]    || die "Repo URL cannot be empty."

require_cmd git "Git is not installed. Please install Git and rerun."

COMPOSE_SUBDIR="scripts/docker-compose"
ENV_FILE="$CLONE_DIR/$COMPOSE_SUBDIR/common.env"
UPGRADE_SCRIPT="$CLONE_DIR/$COMPOSE_SUBDIR/upgrade.sh"

[[ -d "$CLONE_DIR" ]] || die "Install directory not found: $CLONE_DIR (nothing to upgrade). Use install.sh for a fresh install."
[[ -f "$ENV_FILE" ]]  || die "No existing install: $ENV_FILE not found. Use install.sh for a fresh install."

docker_preflight

info "Upgrading OpenReplay in $CLONE_DIR to '$REPO_BRANCH'"

# 1. Back up the current common.env (holds secrets, passwords, domain).
BACKUP_ENV="$(mktemp "${TMPDIR:-/tmp}/openreplay-upgrade-XXXXXX.env")"
cp -- "$ENV_FILE" "$BACKUP_ENV"
info "Backed up current common.env -> $BACKUP_ENV"

# 2. Fetch and check out the target version.
# docker-install.sh produces a shallow, single-ref clone, so a bare branch
# name (e.g. main) is not a local ref. Fetch the requested ref explicitly,
# then check out FETCH_HEAD, which resolves for both tags and branches.
# (Checkout resets common.env to the template; step 1 already backed it up.)
info "Fetching new version code ($REPO_BRANCH)..."
git -C "$CLONE_DIR" fetch --force --tags "$REPO_URL" "$REPO_BRANCH" || \
	die "Failed to fetch '$REPO_BRANCH' from $REPO_URL"
git -C "$CLONE_DIR" checkout -f FETCH_HEAD || die "Failed to check out '$REPO_BRANCH'"

[[ -f "$UPGRADE_SCRIPT" ]] || die "upgrade.sh not found in target version ($UPGRADE_SCRIPT)."

# 3. Run the version's upgrade.sh, feeding it the backed-up env.
info "Running upgrade (merge secrets + migrate + recreate)..."
(
	cd "$CLONE_DIR/$COMPOSE_SUBDIR" || die "Failed to cd into compose dir"
	bash upgrade.sh "$BACKUP_ENV"
) || die "Upgrade failed. Your previous env is preserved at: $BACKUP_ENV"

# 4. Best-effort verification.
PW="$(grep -E '^COMMON_PG_PASSWORD=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [[ -n "$PW" ]]; then
	VER="$(docker exec postgres bash -c "PGPASSWORD=$PW psql -U postgres -h 127.0.0.1 -tc 'SELECT openreplay_version();'" 2>/dev/null | tr -d ' \n' || true)"
	[[ -n "$VER" ]] && info "Reported openreplay_version(): $VER"
fi

info "Upgrade complete. Backup of previous env kept at: $BACKUP_ENV"

#!/usr/bin/env bash

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
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then
		printf '\033[0;32m[INFO] %s\033[0m\n' "$*" >&2
	else
		printf '[INFO] %s\n' "$*" >&2
	fi
}

warn() {
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then
		printf '\033[0;33m[WARN] %s\033[0m\n' "$*" >&2
	else
		printf '[WARN] %s\n' "$*" >&2
	fi
}

die() {
	if [[ "$COLOR_ENABLED" -eq 1 ]]; then
		printf '\033[0;31m[ERROR] %s\033[0m\n' "$*" >&2
	else
		printf '[ERROR] %s\n' "$*" >&2
	fi
	exit 1
}

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "$2"
}

docker_preflight() {
	require_cmd docker "Docker is not installed. Install Docker and rerun."

	if docker info >/dev/null 2>&1; then
		info "Docker daemon is reachable."
	else
		die "Docker is installed but the daemon is not reachable. Ensure Docker is running and that your user has permissions (Linux: add user to 'docker' group or run via sudo)."
	fi

	if docker compose version >/dev/null 2>&1; then
		info "Docker Compose plugin detected (docker compose)."
		return 0
	fi

	if command -v docker-compose >/dev/null 2>&1; then
		info "Legacy Docker Compose detected (docker-compose)."
		return 0
	fi

	die "Docker Compose not found. Install Docker Compose (plugin: 'docker compose') or legacy 'docker-compose' and rerun."
}

usage() {
	cat >&2 <<'EOF'
Usage: docker-install.sh [options]

Options:
  -b, --branch <name>     Git branch/tag to clone (default: main)
  -d, --dir <path>        Directory to clone into (default: ./openreplay)
  -r, --repo-url <url>    Repository URL (default: OpenReplay GitHub)
  -f, --force             Remove existing clone directory if present
  -y, --yes               Non-interactive, do not prompt
  -h, --help              Show this help
EOF
}

REPO_URL="$REPO_URL_DEFAULT"
REPO_BRANCH="${REPO_BRANCH:-$REPO_BRANCH_DEFAULT}"
CLONE_DIR="${CLONE_DIR:-$CLONE_DIR_DEFAULT}"
FORCE=0
NON_INTERACTIVE=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		-b|--branch)
			REPO_BRANCH="${2:-}"; shift 2 ;;
		-d|--dir)
			CLONE_DIR="${2:-}"; shift 2 ;;
		-r|--repo-url)
			REPO_URL="${2:-}"; shift 2 ;;
		-f|--force)
			FORCE=1; shift ;;
		-y|--yes)
			NON_INTERACTIVE=1; shift ;;
		-h|--help)
			usage; exit 0 ;;
		*)
			die "Unknown argument: $1" ;;
	esac
done

[[ -n "$REPO_BRANCH" ]] || die "Branch cannot be empty"
[[ -n "$CLONE_DIR" ]] || die "Clone directory cannot be empty"
[[ -n "$REPO_URL" ]] || die "Repo URL cannot be empty"

if [[ "$NON_INTERACTIVE" -eq 0 ]] && [[ -t 0 ]]; then
	read -rp "Enter the version to clone (default is '$REPO_BRANCH'): " _branch
	REPO_BRANCH="${_branch:-$REPO_BRANCH}"
fi

require_cmd git "Git is not installed. Please install Git and rerun."

docker_preflight

if [[ -e "$CLONE_DIR" ]]; then
	if [[ "$FORCE" -eq 1 ]]; then
		warn "Removing existing directory: $CLONE_DIR"
		rm -rf -- "$CLONE_DIR"
	else
		die "Target directory already exists: $CLONE_DIR (use --force to overwrite)"
	fi
fi

info "Cloning $REPO_URL (branch/tag: $REPO_BRANCH) into $CLONE_DIR"
git clone --depth 1 --branch "$REPO_BRANCH" -- "$REPO_URL" "$CLONE_DIR" || die "Failed to clone the repository."

SCRIPT_DIR="$CLONE_DIR/scripts/docker-compose"
SCRIPT_PATH="$SCRIPT_DIR/install.sh"

[[ -d "$SCRIPT_DIR" ]] || die "Directory does not exist: $SCRIPT_DIR"
[[ -f "$SCRIPT_PATH" ]] || die "Installer script not found: $SCRIPT_PATH"

info "Running installer: $SCRIPT_PATH"
bash "$SCRIPT_PATH"

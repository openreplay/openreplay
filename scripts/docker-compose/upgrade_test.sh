#!/usr/bin/env bash
# Tests for upgrade.sh — dependency-free bash harness.
# Run: bash upgrade_test.sh
set -uo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$TEST_DIR/upgrade.sh"

fails=0
pass() { echo "PASS: $1"; }
fail() {
	echo "FAIL: $1"
	fails=$((fails + 1))
}

# --- Sandbox: run the script in an isolated CWD with stubbed side-effect cmds ---
# so sourcing it can never touch the real repo, docker, or network.
make_sandbox() {
	local root
	root="$(mktemp -d)"
	mkdir -p "$root/work" "$root/schema/db/init_dbs/postgresql" "$root/bin"
	for c in docker sudo envsubst; do
		printf '#!/usr/bin/env bash\nexit 0\n' >"$root/bin/$c"
		chmod +x "$root/bin/$c"
	done
	cp "$SCRIPT" "$root/work/upgrade.sh"
	echo "$root"
}

# --- T1: merge_envs must skip comment/blank/keyless lines so the merged
#         common.env stays sourceable, while carrying old secrets forward. ---
test_merge_sourceable() {
	local root; root="$(make_sandbox)"
	cat >"$root/work/old.env" <<'EOF'
COMMON_VERSION=v1.27.0
COMMON_PG_PASSWORD=secretpw
## DB versions

######################################
COMMON_S3_KEY=abc123
EOF
	cat >"$root/work/common.env" <<'EOF'
COMMON_VERSION=v1.28.0
COMMON_PG_PASSWORD=change_me
COMMON_S3_KEY=change_me
EOF

	(
		cd "$root/work" || exit 1
		export PATH="$root/bin:$PATH"
		original_env_file="old.env"
		new_env_file="./common.env"
		temp_env_file="$(mktemp)"
		# shellcheck disable=SC1091
		source ./upgrade.sh "old.env" >/dev/null 2>&1 || true
		merge_envs
	)

	local merged="$root/work/common.env" rc
	( set -a; source "$merged" ) >/dev/null 2>"$root/err"
	rc=$?
	if [[ $rc -eq 0 && ! -s "$root/err" ]]; then
		pass "merged common.env is sourceable (clean, no stderr)"
	else
		fail "merged common.env is sourceable (rc=$rc, err='$(tr '\n' ';' <"$root/err")')"
	fi
	grep -q '^COMMON_PG_PASSWORD=secretpw$' "$merged" && pass "old pg password carried forward" || fail "old pg password carried forward"
	grep -q '^COMMON_S3_KEY=abc123$' "$merged" && pass "old s3 key carried forward" || fail "old s3 key carried forward"
	grep -Eq '^[[:space:]]*=' "$merged" && fail "no keyless (=) junk line appended" || pass "no keyless (=) junk line appended"

	rm -rf "$root"
}

# --- T2: migration docker network must match the compose project network name. ---
test_network_name() {
	grep -q 'docker-compose_openreplay-net' "$SCRIPT" && pass "correct migration network name" || fail "correct migration network name"
	if grep -q 'opereplay' "$SCRIPT"; then fail "no 'opereplay' typo"; else pass "no 'opereplay' typo"; fi
}

# --- T3: launch must use the docker compose v2 plugin, not legacy docker-compose. ---
test_compose_v2() {
	grep -q 'docker compose up' "$SCRIPT" && pass "uses 'docker compose' (v2)" || fail "uses 'docker compose' (v2)"
	if grep -Eq 'docker-compose up' "$SCRIPT"; then fail "no legacy 'docker-compose up'"; else pass "no legacy 'docker-compose up'"; fi
}

# Release-owned version pins must come from the target template; user settings
# still come from the existing installation.
test_merge_release_versions() {
	local root; root="$(make_sandbox)"
	cat >"$root/work/old.env" <<'EOF'
COMMON_VERSION=v1.27.0
API_VERSION=v1.27.6
FRONTEND_VERSION=v1.27.17
CHALICE_VERSION=v1.27.14
DB_VERSION=v1.27.3
POSTGRES_VERSION=16
REDIS_VERSION=7
MINIO_VERSION=old-minio
CLICKHOUSE_VERSION=old-clickhouse
RETIRED_SERVICE_VERSION=old-retired
COMMON_PG_PASSWORD=existing-password
COMMON_DOMAIN_NAME=replay.example.test
COMMON_JWT_SECRET=existing-secret
CUSTOM_SETTING=preserved
EOF
	cat >"$root/work/common.env" <<'EOF'
COMMON_VERSION=v1.28.0
API_VERSION=v1.28.0
FRONTEND_VERSION=v1.28.0
CHALICE_VERSION=v1.28.0
DB_VERSION=v1.28.0
POSTGRES_VERSION=17
REDIS_VERSION=8
MINIO_VERSION=new-minio
CLICKHOUSE_VERSION=new-clickhouse
NEW_SERVICE_VERSION=new-service
COMMON_PG_PASSWORD=change_me
COMMON_DOMAIN_NAME=change_me
COMMON_JWT_SECRET=change_me
EOF
	cp "$root/work/common.env" "$root/target.env"
	(
		cd "$root/work" || exit 1
		export PATH="$root/bin:$PATH"
		source ./upgrade.sh "old.env" >/dev/null 2>&1
		printf '%s\n' "$original_version" >"$root/original-version"
		printf '%s\n' "$pgpassword" >"$root/pg-password"
	)
	local merged="$root/work/common.env" expected
	while IFS= read -r expected; do
		grep -Fxq "$expected" "$merged" && pass "target $expected retained" || fail "target $expected retained"
	done < <(grep '_VERSION=' "$root/target.env")
	if grep -q '^RETIRED_SERVICE_VERSION=' "$merged"; then
		fail "retired service pin is not reintroduced"
	else
		pass "retired service pin is not reintroduced"
	fi
	for expected in COMMON_PG_PASSWORD=existing-password COMMON_DOMAIN_NAME=replay.example.test COMMON_JWT_SECRET=existing-secret CUSTOM_SETTING=preserved; do
		grep -Fxq "$expected" "$merged" && pass "$expected carried forward" || fail "$expected carried forward"
	done
	grep -Fxq 'v1.27.0' "$root/original-version" && pass "migration uses original release" || fail "migration uses original release"
	grep -Fxq 'existing-password' "$root/pg-password" && pass "migration uses existing password" || fail "migration uses existing password"
	rm -rf "$root"
}

test_merge_sourceable
test_merge_release_versions
test_network_name
test_compose_v2

echo "------"
if [[ $fails -gt 0 ]]; then
	echo "$fails assertion(s) FAILED"
	exit 1
fi
echo "all tests passed"

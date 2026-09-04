#!/usr/bin/env bash
# Tests for docker-upgrade.sh — dependency-free bash harness.
# Run: bash docker-upgrade_test.sh
set -uo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$TEST_DIR/docker-upgrade.sh"

fails=0
pass() { echo "PASS: $1"; }
fail() {
	echo "FAIL: $1"
	fails=$((fails + 1))
}

# Build an isolated sandbox: a fake existing install + stubbed git/docker,
# plus a fake upgrade.sh that records the args it was called with.
make_sandbox() {
	local root
	root="$(mktemp -d)"
	mkdir -p "$root/bin" "$root/tmp" "$root/install/scripts/docker-compose"

	# fake existing install: common.env with real secrets
	cat >"$root/install/scripts/docker-compose/common.env" <<'EOF'
COMMON_VERSION=v1.27.0
COMMON_PG_PASSWORD=oldsecret123
CADDY_DOMAIN="rl-docker.rjsh.me"
EOF

	# fake upgrade.sh: log the args passed to it (proves invocation + backup path)
	cat >"$root/install/scripts/docker-compose/upgrade.sh" <<EOF
#!/usr/bin/env bash
echo "\$@" > "$root/tmp/upgrade.args"
exit 0
EOF
	chmod +x "$root/install/scripts/docker-compose/upgrade.sh"

	# git stub: logs calls; on checkout, resets common.env to template
	# (so backup MUST have happened before checkout to preserve secrets).
	# Models a shallow, single-ref clone (what docker-install.sh produces):
	# a bare branch/tag name is NOT a local ref, so `git checkout <name>`
	# fails with a pathspec error. Only `git checkout FETCH_HEAD` (after a
	# fetch) resolves. This forces the script to fetch-then-checkout FETCH_HEAD.
	cat >"$root/bin/git" <<EOF
#!/usr/bin/env bash
echo "git \$*" >> "$root/tmp/git.log"
dir="."; sawco=0; target=""
while [[ \$# -gt 0 ]]; do
	case "\$1" in
		-C) dir="\$2"; shift 2 ;;
		checkout) sawco=1; shift ;;
		-f) shift ;;
		*) [[ \$sawco -eq 1 && -z "\$target" ]] && target="\$1"; shift ;;
	esac
done
if [[ \$sawco -eq 1 ]]; then
	if [[ "\$target" != "FETCH_HEAD" ]]; then
		echo "error: pathspec '\$target' did not match any file(s) known to git" >&2
		exit 1
	fi
	printf 'COMMON_VERSION=v1.28.0\nCOMMON_PG_PASSWORD=change_me\n' > "\$dir/scripts/docker-compose/common.env"
fi
exit 0
EOF
	chmod +x "$root/bin/git"

	# docker stub: no-op (used by preflight + best-effort verify)
	cat >"$root/bin/docker" <<'EOF'
#!/usr/bin/env bash
case "$1" in
	info) exit 0 ;;
	compose) [[ "$2" == "version" ]] && exit 0 ;;
esac
exit 0
EOF
	chmod +x "$root/bin/docker"

	echo "$root"
}

run_script() {
	# $1=root, rest=args. Runs docker-upgrade.sh with stubbed PATH + TMPDIR.
	local root="$1"; shift
	( export PATH="$root/bin:$PATH" TMPDIR="$root/tmp"
	  bash "$SCRIPT" "$@" </dev/null ) >"$root/tmp/out" 2>&1
	echo $?
}

run_script_cwd() {
	# like run_script but runs from $2 as cwd (to exercise the default dir).
	local root="$1" cwd="$2"; shift 2
	( export PATH="$root/bin:$PATH" TMPDIR="$root/tmp"
	  cd "$cwd" && bash "$SCRIPT" "$@" </dev/null ) >"$root/tmp/out" 2>&1
	echo $?
}

# --- T1: dies when target dir has no existing install (no common.env) ---
test_missing_install() {
	local root rc; root="$(make_sandbox)"
	rm "$root/install/scripts/docker-compose/common.env"
	rc="$(run_script "$root" -b pre-v1.28.0 -d "$root/install" -y)"
	[[ "$rc" -ne 0 ]] && pass "dies when no existing install" || fail "dies when no existing install (rc=$rc)"
	grep -qi "common.env" "$root/tmp/out" && pass "error mentions common.env" || fail "error mentions common.env"
	rm -rf "$root"
}

# --- T2: -b defaults to main (non-interactive, no prompt) ---
test_defaults_branch_main() {
	local root rc; root="$(make_sandbox)"
	rc="$(run_script "$root" -d "$root/install" -y)"
	[[ "$rc" -eq 0 ]] && pass "runs without -b (default)" || fail "runs without -b (default) (rc=$rc)"
	grep -Eq 'fetch.*(^| )main' "$root/tmp/git.log" && pass "fetches default branch main" || fail "fetches default branch main ($(cat "$root/tmp/git.log"))"
	grep -q 'checkout.*FETCH_HEAD' "$root/tmp/git.log" && pass "checks out FETCH_HEAD (shallow-safe)" || fail "checks out FETCH_HEAD (shallow-safe)"
	rm -rf "$root"
}

# --- T2b: -d defaults to ./openreplay relative to CWD ---
test_default_dir() {
	local root rc; root="$(make_sandbox)"
	# relocate the fake install to $root/openreplay so ./openreplay resolves
	mv "$root/install" "$root/openreplay"
	cat >"$root/openreplay/scripts/docker-compose/upgrade.sh" <<EOF
#!/usr/bin/env bash
echo "\$@" > "$root/tmp/upgrade.args"
exit 0
EOF
	chmod +x "$root/openreplay/scripts/docker-compose/upgrade.sh"
	rc="$(run_script_cwd "$root" "$root" -b pre-v1.28.0 -y)"
	[[ "$rc" -eq 0 ]] && pass "defaults dir to ./openreplay" || fail "defaults dir to ./openreplay (rc=$rc, $(tail -2 "$root/tmp/out"|tr '\n' ';'))"
	rm -rf "$root"
}

# --- T3: happy path — backup made BEFORE checkout, upgrade.sh gets backup arg ---
test_happy_path() {
	local root rc; root="$(make_sandbox)"
	rc="$(run_script "$root" -b pre-v1.28.0 -d "$root/install" -y)"
	[[ "$rc" -eq 0 ]] && pass "happy path exits 0" || fail "happy path exits 0 (rc=$rc, $(tail -3 "$root/tmp/out"|tr '\n' ';'))"

	# a backup file exists containing the OLD secret
	local bkp
	bkp="$(grep -rl 'oldsecret123' "$root/tmp"/*.env 2>/dev/null | head -1)"
	[[ -n "$bkp" ]] && pass "backup file preserves old secret" || fail "backup file preserves old secret"

	# git was told to fetch tags and checkout the requested tag
	grep -Eq 'fetch.*pre-v1.28.0' "$root/tmp/git.log" && pass "git fetch <tag> called" || fail "git fetch <tag> called"
	grep -q 'checkout.*FETCH_HEAD' "$root/tmp/git.log" && pass "git checkout FETCH_HEAD called" || fail "git checkout FETCH_HEAD called"

	# upgrade.sh was invoked with the backup path as its argument
	if [[ -f "$root/tmp/upgrade.args" ]]; then
		local passed_arg; passed_arg="$(cat "$root/tmp/upgrade.args")"
		[[ -n "$passed_arg" && -f "$passed_arg" ]] && grep -q 'oldsecret123' "$passed_arg" \
			&& pass "upgrade.sh called with backup env path" \
			|| fail "upgrade.sh called with backup env path (got '$passed_arg')"
	else
		fail "upgrade.sh was invoked"
	fi
	rm -rf "$root"
}

# --- T4: --help exits 0 ---
test_help() {
	local root rc; root="$(make_sandbox)"
	rc="$(run_script "$root" --help)"
	[[ "$rc" -eq 0 ]] && pass "--help exits 0" || fail "--help exits 0 (rc=$rc)"
	rm -rf "$root"
}

test_missing_install
test_defaults_branch_main
test_default_dir
test_happy_path
test_help

echo "------"
if [[ $fails -gt 0 ]]; then
	echo "$fails assertion(s) FAILED"
	exit 1
fi
echo "all tests passed"
